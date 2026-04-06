import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";
import { getObjectText, getObjectBuffer, putObject, visualizationKey } from "@/lib/storage/s3";
import { analyzeWork, synthesizeImagePrompts } from "@/lib/anthropic/analyze";
import { generateImage, downloadImageBuffer } from "@/lib/image-gen/client";
import { watermarkImage } from "@/lib/rights/watermark";

type Params = { params: Promise<{ workId: string }> };

/**
 * POST /api/works/[workId]/analyze
 *
 * Orchestrates the full analysis pipeline:
 *   Step A — Claude literary analysis (Opus, with thinking)
 *   Step B — Image prompt synthesis (Haiku)
 *   Step C — Image generation + S3 storage (runs async, returns 202 immediately)
 */
export async function POST(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
    include: { rights: true },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (work.status !== "READY") {
    return NextResponse.json(
      { error: "Work must be in READY status before analysis" },
      { status: 422 }
    );
  }

  // Check for existing analysis — allow re-run for Pro tier only
  const existingAnalysis = await prisma.analysisResult.findUnique({
    where: { workId },
  });
  if (existingAnalysis && user.planTier === "FREE") {
    return NextResponse.json(
      { error: "Re-analysis requires Pro tier" },
      { status: 422 }
    );
  }

  // Create/reset analysis record as PENDING
  const analysisRecord = await prisma.analysisResult.upsert({
    where: { workId },
    create: {
      workId,
      claudeModel: "claude-opus-4-6",
      analysisVersion: 1,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
      errorMessage: null,
      analysisVersion: { increment: 1 },
    },
  });

  // Kick off background processing — don't await
  void runAnalysisPipeline({
    workId,
    work,
    user,
    analysisRecordId: analysisRecord.id,
  }).catch((err) => {
    console.error(`Analysis pipeline error for work ${workId}:`, err);
  });

  return NextResponse.json(
    { jobId: analysisRecord.id, message: "Analysis started" },
    { status: 202 }
  );
}

interface PipelineInput {
  workId: string;
  work: {
    storageKey: string;
    title: string;
    rights: { watermarkEnabled: boolean; watermarkText: string | null } | null;
  };
  user: { id: string; name: string | null; email: string };
  analysisRecordId: string;
}

async function runAnalysisPipeline(input: PipelineInput): Promise<void> {
  const { workId, work, user, analysisRecordId } = input;

  try {
    // Fetch manuscript text from S3
    let manuscriptText: string;
    try {
      manuscriptText = await getObjectText(work.storageKey);
    } catch {
      // Try as binary (PDF handling would go here)
      const buf = await getObjectBuffer(work.storageKey);
      manuscriptText = buf.toString("utf-8");
    }

    // Step A: Literary analysis
    const analysis = await analyzeWork(manuscriptText, workId);

    // Persist analysis result
    await prisma.analysisResult.update({
      where: { id: analysisRecordId },
      data: {
        claudeModel: "claude-opus-4-6",
        characters: analysis.characters as object[],
        scenes: analysis.scenes as object[],
        themes: analysis.themes,
        styleNotes: analysis.styleNotes,
        narrativeArc: analysis.narrativeArc,
        genre: analysis.genre,
        genreConfidence: analysis.genreConfidence,
        coverArtConcept: analysis.coverArtConcept,
        typographyMood: analysis.typographyMood,
        status: "GENERATED",
      },
    });

    // Step B: Image prompt synthesis
    const imagePrompts = await synthesizeImagePrompts(analysis);

    // Step C: Generate and store visualizations in parallel
    const visualizationTasks: Array<{
      type: "COVER_ART" | "CHARACTER_PORTRAIT" | "SCENE_ILLUSTRATION" | "TYPOGRAPHY_PREVIEW" | "READING_FLOW";
      prompt: string;
    }> = [];

    if (imagePrompts.coverArt) {
      visualizationTasks.push({ type: "COVER_ART", prompt: imagePrompts.coverArt });
    }
    imagePrompts.characterPortraits?.forEach((prompt) => {
      visualizationTasks.push({ type: "CHARACTER_PORTRAIT", prompt });
    });
    imagePrompts.sceneIllustrations?.forEach((prompt) => {
      visualizationTasks.push({ type: "SCENE_ILLUSTRATION", prompt });
    });

    // Always create a READING_FLOW and TYPOGRAPHY_PREVIEW record
    // (these are client-rendered from analysis data, no image generation needed)
    await prisma.visualization.createMany({
      data: [
        {
          workId,
          analysisResultId: analysisRecordId,
          type: "READING_FLOW",
          status: "GENERATED",
          generatedAt: new Date(),
        },
        {
          workId,
          analysisResultId: analysisRecordId,
          type: "TYPOGRAPHY_PREVIEW",
          prompt: analysis.typographyMood,
          status: "GENERATED",
          generatedAt: new Date(),
        },
      ],
    });

    // Create pending visualization records for image-gen types
    const vizRecords = await Promise.all(
      visualizationTasks.map((task) =>
        prisma.visualization.create({
          data: {
            workId,
            analysisResultId: analysisRecordId,
            type: task.type,
            prompt: task.prompt,
            status: "PENDING",
          },
        })
      )
    );

    // Generate images in parallel
    const watermarkText =
      work.rights?.watermarkEnabled
        ? (work.rights.watermarkText ?? `© ${new Date().getFullYear()} ${user.name ?? user.email}`)
        : null;

    await Promise.all(
      vizRecords.map(async (viz, i) => {
        const task = visualizationTasks[i]!;
        try {
          const generated = await generateImage({ prompt: task.prompt });
          const imageBuffer = await downloadImageBuffer(generated.url);

          const finalBuffer = watermarkText
            ? await watermarkImage(imageBuffer, {
                text: watermarkText,
                position: "bottom-right",
              })
            : imageBuffer;

          const key = visualizationKey(workId, viz.id);
          await putObject(key, finalBuffer, "image/png");

          await prisma.visualization.update({
            where: { id: viz.id },
            data: {
              storageKey: key,
              status: "GENERATED",
              generatedAt: new Date(),
            },
          });
        } catch (err) {
          await prisma.visualization.update({
            where: { id: viz.id },
            data: {
              status: "FAILED",
              errorMessage:
                err instanceof Error ? err.message : "Unknown error",
            },
          });
        }
      })
    );
  } catch (err) {
    await prisma.analysisResult.update({
      where: { id: analysisRecordId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

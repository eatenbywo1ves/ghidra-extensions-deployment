import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getUserFromToken } from "@/lib/auth/session";
import { getPresignedDownloadUrl } from "@/lib/storage/s3";
import type { VisualizationStatus } from "@/types/api";

type Params = { params: Promise<{ workId: string }> };

// GET /api/visualizations/[workId] — poll status of all visualizations
export async function GET(request: NextRequest, { params }: Params) {
  const user = await getUserFromToken(request.headers.get("Authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workId } = await params;

  // Verify ownership
  const work = await prisma.work.findFirst({
    where: { id: workId, authorId: user.id },
  });
  if (!work) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visualizations = await prisma.visualization.findMany({
    where: { workId },
    orderBy: { createdAt: "asc" },
  });

  const result: VisualizationStatus[] = await Promise.all(
    visualizations.map(async (viz) => {
      let url: string | undefined;
      if (viz.status === "GENERATED" && viz.storageKey) {
        try {
          url = await getPresignedDownloadUrl(viz.storageKey, 3600);
        } catch {
          // URL generation failed — continue without it
        }
      }
      return {
        id: viz.id,
        type: viz.type,
        status: viz.status,
        url,
        prompt: viz.prompt ?? undefined,
        generatedAt: viz.generatedAt?.toISOString(),
      };
    })
  );

  return NextResponse.json(result);
}

import { anthropic } from "./client";
import {
  LITERARY_ANALYSIS_SYSTEM_PROMPT,
  IMAGE_PROMPT_SYNTHESIS_SYSTEM_PROMPT,
} from "./prompts";
import {
  LiteraryAnalysisSchema,
  ImagePromptsSchema,
  type LiteraryAnalysis,
  type ImagePrompts,
} from "./types";

/**
 * Step A — Literary analysis using claude-opus-4-6 with extended thinking.
 * The system prompt is marked for caching so it is reused across all works.
 *
 * @param manuscriptText - The full text content of the work
 * @param workId - Used for logging/tracing only
 */
export async function analyzeWork(
  manuscriptText: string,
  workId: string
): Promise<LiteraryAnalysis> {
  // Truncate to ~100k chars to stay within token limits for very large works
  const truncated =
    manuscriptText.length > 100_000
      ? manuscriptText.slice(0, 100_000) +
        "\n\n[Note: text truncated for analysis]"
      : manuscriptText;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8000,
    thinking: {
      type: "enabled",
      budget_tokens: 3000,
    },
    system: [
      {
        type: "text",
        text: LITERARY_ANALYSIS_SYSTEM_PROMPT,
        // @ts-expect-error cache_control is valid in the API but not yet typed
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Analyze this work (ID: ${workId}):\n\n${truncated}`,
      },
    ],
  });

  // Extract the text block (skip thinking blocks)
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude analysis response");
  }

  // Parse JSON from the response
  let parsed: unknown;
  try {
    // Strip potential markdown code fences
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Claude analysis JSON: ${textBlock.text.slice(0, 200)}`);
  }

  const result = LiteraryAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Claude analysis schema validation failed: ${result.error.message}`
    );
  }

  return result.data;
}

/**
 * Step B — Image prompt synthesis using claude-haiku-4-5.
 * Fast, cheap call to convert structured analysis into tight image-gen prompts.
 */
export async function synthesizeImagePrompts(
  analysis: LiteraryAnalysis
): Promise<ImagePrompts> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    system: IMAGE_PROMPT_SYNTHESIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate image prompts for the following literary analysis:\n\n${JSON.stringify(
          {
            characters: analysis.characters.slice(0, 3), // top 3 characters
            scenes: analysis.scenes.slice(0, 2), // top 2 scenes
            coverArtConcept: analysis.coverArtConcept,
            genre: analysis.genre,
            typographyMood: analysis.typographyMood,
          },
          null,
          2
        )}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in prompt synthesis response");
  }

  let parsed: unknown;
  try {
    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Failed to parse image prompts JSON");
  }

  const result = ImagePromptsSchema.safeParse(parsed);
  if (!result.success) {
    // Non-fatal: return empty prompts rather than failing the whole pipeline
    console.warn("Image prompts schema mismatch, using empty:", result.error.message);
    return {};
  }

  return result.data;
}

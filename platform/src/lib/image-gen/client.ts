/**
 * Abstract image generation client.
 * Supports DALL-E (OpenAI) and Replicate (Flux/SDXL).
 * The provider is selected via IMAGE_GEN_PROVIDER env var.
 */

export interface GenerateImageOptions {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
}

export interface GeneratedImage {
  url: string;        // Temporary URL from the provider
  revisedPrompt?: string;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GeneratedImage> {
  const provider = process.env.IMAGE_GEN_PROVIDER ?? "dalle";

  if (provider === "dalle") {
    return generateWithDalle(options);
  } else if (provider === "replicate") {
    return generateWithReplicate(options);
  }

  throw new Error(`Unknown image generation provider: ${provider}`);
}

async function generateWithDalle(
  options: GenerateImageOptions
): Promise<GeneratedImage> {
  const { prompt, size = "1024x1024", quality = "standard" } = options;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality,
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DALL-E API error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ url: string; revised_prompt?: string }>;
  };

  const item = data.data[0];
  if (!item?.url) throw new Error("No image URL in DALL-E response");

  return {
    url: item.url,
    revisedPrompt: item.revised_prompt,
  };
}

async function generateWithReplicate(
  options: GenerateImageOptions
): Promise<GeneratedImage> {
  const { prompt } = options;
  const model =
    process.env.REPLICATE_MODEL ?? "black-forest-labs/flux-schnell";

  // Start prediction
  const startRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: model,
      input: { prompt },
    }),
  });

  if (!startRes.ok) {
    throw new Error(`Replicate start error ${startRes.status}`);
  }

  let prediction = (await startRes.json()) as {
    id: string;
    status: string;
    output?: string[];
    error?: string;
  };

  // Poll until complete (max 120 seconds)
  const deadline = Date.now() + 120_000;
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    if (Date.now() > deadline) throw new Error("Replicate prediction timed out");
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      }
    );
    prediction = await pollRes.json();
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  const url = prediction.output?.[0];
  if (!url) throw new Error("No output URL from Replicate");

  return { url };
}

/**
 * Download an image from a temporary URL and return it as a Buffer.
 * Used to persist images to S3 before temporary URLs expire.
 */
export async function downloadImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: HTTP ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

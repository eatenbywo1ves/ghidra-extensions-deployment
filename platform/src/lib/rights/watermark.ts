/**
 * Server-side image watermarking using the sharp library.
 * Applied to visualization assets before they are made publicly accessible.
 */
import sharp from "sharp";

export interface WatermarkOptions {
  text: string;          // e.g. "© 2024 Jane Doe"
  opacity?: number;      // 0.0–1.0, default 0.4
  position?: "bottom-right" | "bottom-left" | "center" | "tile";
  fontSize?: number;     // default 24
}

/**
 * Apply a text watermark to an image buffer.
 * Returns a new PNG buffer with the watermark composited.
 */
export async function watermarkImage(
  imageBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const { text, opacity = 0.4, position = "bottom-right", fontSize = 24 } = options;

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 512;
  const height = metadata.height ?? 512;

  // Build SVG text overlay
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");

  let svgOverlay: string;

  if (position === "tile") {
    // Tiled watermark across the entire image
    const tileStep = Math.floor(Math.min(width, height) / 3);
    const marks = [];
    for (let y = tileStep; y < height; y += tileStep) {
      for (let x = 0; x < width; x += tileStep * 2) {
        marks.push(
          `<text x="${x}" y="${y}" transform="rotate(-30 ${x} ${y})"
            font-family="sans-serif" font-size="${fontSize}"
            fill="#ffffff${alpha}">${escapeXml(text)}</text>`
        );
      }
    }
    svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      ${marks.join("\n")}
    </svg>`;
  } else {
    const positions: Record<typeof position, { x: number | string; y: number | string; anchor: string }> = {
      "bottom-right": { x: width - 16, y: height - 16, anchor: "end" },
      "bottom-left": { x: 16, y: height - 16, anchor: "start" },
      center: { x: width / 2, y: height / 2, anchor: "middle" },
      tile: { x: 0, y: 0, anchor: "start" }, // unreachable
    };
    const pos = positions[position];

    svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${pos.x}" y="${pos.y}"
        text-anchor="${pos.anchor}"
        font-family="sans-serif"
        font-size="${fontSize}"
        fill="#ffffff${alpha}"
        stroke="#00000044"
        stroke-width="1">${escapeXml(text)}</text>
    </svg>`;
  }

  const overlayBuffer = Buffer.from(svgOverlay);

  return image
    .composite([{ input: overlayBuffer, blend: "over" }])
    .png()
    .toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

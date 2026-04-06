import { createHash } from "crypto";

/**
 * Compute a SHA-256 provenance hash binding content to author identity.
 * The hash includes: raw file bytes + ISO timestamp + authorId.
 * This produces a tamper-evident, timestamped record of the content.
 */
export function computeContentHash(
  fileBytes: Buffer,
  authorId: string,
  timestamp: Date = new Date()
): string {
  return createHash("sha256")
    .update(fileBytes)
    .update(authorId)
    .update(timestamp.toISOString())
    .digest("hex");
}

/**
 * Count words in a plain-text string (UTF-8 safe).
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Truncate text to a maximum word count, preserving word boundaries.
 * Returns the truncated text and a boolean indicating whether truncation occurred.
 */
export function truncateToWords(
  text: string,
  maxWords: number
): { text: string; truncated: boolean } {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return { text, truncated: false };
  }
  return {
    text: words.slice(0, maxWords).join(" "),
    truncated: true,
  };
}

/**
 * Inject a visible copyright notice at the end of each paragraph.
 * Also injects a Unicode zero-width non-joiner (ZWNJ) watermark pattern
 * as a steganographic marker.
 */
export function injectTextWatermark(
  text: string,
  authorName: string,
  year: number,
  customText?: string
): string {
  const notice = customText ?? `© ${year} ${authorName}. All rights reserved.`;
  // Zero-width steganographic marker: encode author initials as ZWNJ pattern
  const zwnj = "\u200C"; // zero-width non-joiner
  const zwj = "\u200D";  // zero-width joiner
  const marker = authorName
    .split(" ")
    .map((word) => (word[0] ?? "").toUpperCase())
    .map((ch) => (ch.charCodeAt(0) % 2 === 0 ? zwnj : zwj))
    .join("");

  const paragraphs = text.split(/\n{2,}/);
  return (
    paragraphs
      .map((p, i) => {
        // Embed the invisible marker in every 5th paragraph
        const withMarker = i % 5 === 0 ? marker + p : p;
        return withMarker;
      })
      .join("\n\n") +
    `\n\n---\n${notice}`
  );
}

/**
 * Build the provenance certificate data for PDF generation.
 */
export interface ProvenanceCertData {
  workTitle: string;
  authorName: string;
  authorEmail: string;
  workId: string;
  contentHash: string;
  registeredAt: Date;
  licenseType: string;
  wordCount?: number;
}

export function buildCertificateText(data: ProvenanceCertData): string {
  return [
    "PROVENANCE CERTIFICATE",
    "======================",
    "",
    `Work Title:    ${data.workTitle}`,
    `Author:        ${data.authorName} <${data.authorEmail}>`,
    `Work ID:       ${data.workId}`,
    `Registered:    ${data.registeredAt.toUTCString()}`,
    `License:       ${data.licenseType.replace(/_/g, " ")}`,
    ...(data.wordCount ? [`Word Count:    ${data.wordCount.toLocaleString()}`] : []),
    "",
    "Content Hash (SHA-256):",
    data.contentHash,
    "",
    "This certificate records the existence of the above work as of the",
    "registered timestamp. The content hash is a cryptographic fingerprint",
    "that can be used to verify the work has not been altered since registration.",
    "",
    "This document does not constitute legal copyright registration.",
    "For formal registration, consult your national copyright authority.",
  ].join("\n");
}

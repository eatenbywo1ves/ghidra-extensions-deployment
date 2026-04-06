import {
  computeContentHash,
  countWords,
  truncateToWords,
  injectTextWatermark,
} from "@/lib/rights/provenance";

describe("computeContentHash", () => {
  it("returns a 64-char hex string", () => {
    const hash = computeContentHash(
      Buffer.from("hello world"),
      "user-123",
      new Date("2024-01-01T00:00:00Z")
    );
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces different hashes for different content", () => {
    const ts = new Date("2024-01-01T00:00:00Z");
    const h1 = computeContentHash(Buffer.from("content A"), "user-1", ts);
    const h2 = computeContentHash(Buffer.from("content B"), "user-1", ts);
    expect(h1).not.toBe(h2);
  });

  it("produces different hashes for different authors", () => {
    const ts = new Date("2024-01-01T00:00:00Z");
    const h1 = computeContentHash(Buffer.from("same"), "user-1", ts);
    const h2 = computeContentHash(Buffer.from("same"), "user-2", ts);
    expect(h1).not.toBe(h2);
  });
});

describe("countWords", () => {
  it("counts words correctly", () => {
    expect(countWords("The quick brown fox")).toBe(4);
    expect(countWords("  leading and trailing  ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("truncateToWords", () => {
  it("returns original text if under limit", () => {
    const { text, truncated } = truncateToWords("one two three", 10);
    expect(text).toBe("one two three");
    expect(truncated).toBe(false);
  });

  it("truncates to the specified word count", () => {
    const { text, truncated } = truncateToWords("one two three four five", 3);
    expect(text).toBe("one two three");
    expect(truncated).toBe(true);
  });
});

describe("injectTextWatermark", () => {
  it("appends copyright notice", () => {
    const result = injectTextWatermark("My story.", "Jane Doe", 2024);
    expect(result).toContain("© 2024 Jane Doe");
  });

  it("uses custom text if provided", () => {
    const result = injectTextWatermark(
      "My story.",
      "Jane Doe",
      2024,
      "Custom Notice"
    );
    expect(result).toContain("Custom Notice");
  });
});

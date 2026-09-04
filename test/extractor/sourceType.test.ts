import { describe, it, expect } from "vitest";
import { detectSourceType } from "../../src/extractor/sourceType.js";

describe("detectSourceType", () => {
  it("detects youtube.com URLs", () => {
    expect(detectSourceType("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
  });

  it("detects youtu.be short URLs", () => {
    expect(detectSourceType("https://youtu.be/abc123")).toBe("youtube");
  });

  it("detects instagram.com URLs", () => {
    expect(detectSourceType("https://www.instagram.com/p/abc123/")).toBe("instagram");
  });

  it("falls back to website for anything else", () => {
    expect(detectSourceType("https://example.com/my-recipe")).toBe("website");
  });

  it("falls back to website for an invalid URL", () => {
    expect(detectSourceType("not a url")).toBe("website");
  });
});

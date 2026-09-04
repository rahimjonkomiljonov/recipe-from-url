import { describe, it, expect } from "vitest";
import { parseIso8601DurationToMinutes } from "../../src/extractor/website/durations.js";

describe("parseIso8601DurationToMinutes", () => {
  it("parses minutes only", () => {
    expect(parseIso8601DurationToMinutes("PT30M")).toBe(30);
  });

  it("parses hours only", () => {
    expect(parseIso8601DurationToMinutes("PT1H")).toBe(60);
  });

  it("parses hours and minutes", () => {
    expect(parseIso8601DurationToMinutes("PT1H15M")).toBe(75);
  });

  it("rounds seconds into minutes", () => {
    expect(parseIso8601DurationToMinutes("PT1M30S")).toBe(2);
  });

  it("returns null for empty/undefined input", () => {
    expect(parseIso8601DurationToMinutes("")).toBeNull();
    expect(parseIso8601DurationToMinutes(undefined)).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseIso8601DurationToMinutes("not-a-duration")).toBeNull();
  });
});

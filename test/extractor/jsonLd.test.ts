import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findRecipeCandidates, pickBestRecipeCandidate } from "../../src/extractor/website/jsonLd.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "fixtures");

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("findRecipeCandidates", () => {
  it("finds a plain top-level Recipe node", () => {
    const candidates = findRecipeCandidates(loadFixture("json-ld-simple.html"));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.name).toBe("Simple Pancakes");
  });

  it("finds a Recipe nested inside an @graph array", () => {
    const candidates = findRecipeCandidates(loadFixture("json-ld-graph.html"));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.name).toBe("Graph Wrapped Soup");
  });

  it("finds a Recipe inside an array of top-level JSON-LD objects", () => {
    const candidates = findRecipeCandidates(loadFixture("json-ld-array.html"));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.name).toBe("Array Item Salad");
  });

  it("returns no candidates when there is no JSON-LD Recipe", () => {
    const candidates = findRecipeCandidates(loadFixture("no-json-ld.html"));
    expect(candidates).toHaveLength(0);
  });

  it("finds a Recipe with nested HowToSection instructions", () => {
    const candidates = findRecipeCandidates(loadFixture("json-ld-howto-sections.html"));
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.name).toBe("Sectioned Lasagna");
  });
});

describe("pickBestRecipeCandidate", () => {
  it("returns null for an empty list", () => {
    expect(pickBestRecipeCandidate([])).toBeNull();
  });

  it("picks the candidate with more populated fields", () => {
    const thin = { name: "Thin Recipe" };
    const full = {
      name: "Full Recipe",
      recipeIngredient: ["a", "b"],
      recipeInstructions: ["Step 1", "Step 2"],
      author: "Someone",
    };
    expect(pickBestRecipeCandidate([thin, full])).toBe(full);
  });
});

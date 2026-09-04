import { describe, it, expect } from "vitest";
import { normalizeRecipeNode, flattenInstructions } from "../../src/extractor/website/normalize.js";
import type { RawRecipeNode } from "../../src/extractor/website/jsonLd.js";

describe("flattenInstructions", () => {
  it("splits a plain string on newlines", () => {
    expect(flattenInstructions("Step one.\nStep two.")).toEqual(["Step one.", "Step two."]);
  });

  it("passes through a flat string array", () => {
    expect(flattenInstructions(["Step one.", "Step two."])).toEqual(["Step one.", "Step two."]);
  });

  it("extracts text from HowToStep objects", () => {
    expect(
      flattenInstructions([
        { "@type": "HowToStep", text: "Step one." },
        { "@type": "HowToStep", text: "Step two." },
      ]),
    ).toEqual(["Step one.", "Step two."]);
  });

  it("flattens nested HowToSection > HowToStep in order", () => {
    const value = [
      {
        "@type": "HowToSection",
        name: "Prep",
        itemListElement: [
          { "@type": "HowToStep", text: "Chop onions." },
          { "@type": "HowToStep", text: "Boil water." },
        ],
      },
      {
        "@type": "HowToSection",
        name: "Cook",
        itemListElement: [{ "@type": "HowToStep", text: "Combine and simmer." }],
      },
    ];
    expect(flattenInstructions(value)).toEqual(["Chop onions.", "Boil water.", "Combine and simmer."]);
  });
});

describe("normalizeRecipeNode", () => {
  const base = { sourceUrl: "https://example.com/recipe", pageUrl: "https://example.com/recipe" };

  it("handles string image/author and simple fields", () => {
    const node: RawRecipeNode = {
      name: "Test Recipe",
      image: "photo.jpg",
      author: "Someone",
      recipeIngredient: ["a", "b"],
      recipeInstructions: ["Do this.", "Do that."],
      prepTime: "PT10M",
      recipeYield: "4",
    };
    const result = normalizeRecipeNode(node, base.sourceUrl, base.pageUrl);
    expect(result.title).toBe("Test Recipe");
    expect(result.image).toBe("https://example.com/photo.jpg");
    expect(result.author).toBe("Someone");
    expect(result.ingredients).toEqual(["a", "b"]);
    expect(result.instructions).toEqual(["Do this.", "Do that."]);
    expect(result.prepTimeMinutes).toBe(10);
    expect(result.servings).toBe("4");
  });

  it("handles array image, object author, and array recipeYield", () => {
    const node: RawRecipeNode = {
      name: "Complex Recipe",
      image: ["first.jpg", "second.jpg"],
      author: [{ "@type": "Person", name: "Chef A" }],
      recipeIngredient: ["x"],
      recipeInstructions: ["Only step."],
      recipeYield: ["6", "6 servings"],
    };
    const result = normalizeRecipeNode(node, base.sourceUrl, base.pageUrl);
    expect(result.image).toBe("https://example.com/first.jpg");
    expect(result.author).toBe("Chef A");
    expect(result.servings).toBe("6");
  });

  it("handles ImageObject with url property", () => {
    const node: RawRecipeNode = {
      name: "Image Object Recipe",
      image: { "@type": "ImageObject", url: "img.jpg" },
      recipeIngredient: ["x"],
      recipeInstructions: ["Only step."],
    };
    const result = normalizeRecipeNode(node, base.sourceUrl, base.pageUrl);
    expect(result.image).toBe("https://example.com/img.jpg");
  });

  it("falls back to 'Untitled recipe' when name is missing", () => {
    const node: RawRecipeNode = { recipeIngredient: ["x"], recipeInstructions: ["y"] };
    const result = normalizeRecipeNode(node, base.sourceUrl, base.pageUrl);
    expect(result.title).toBe("Untitled recipe");
  });
});

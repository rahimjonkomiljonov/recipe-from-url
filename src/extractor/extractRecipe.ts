import { detectSourceType } from "./sourceType.js";
import { fetchHtml } from "./fetchHtml.js";
import { findRecipeCandidates, pickBestRecipeCandidate } from "./website/jsonLd.js";
import { normalizeRecipeNode } from "./website/normalize.js";
import { extractWithFallback } from "./website/htmlFallback.js";
import { extractFromYoutube } from "./youtube/youtubeExtractor.js";
import { extractFromInstagram } from "./instagram/instagramExtractor.js";
import { extractRecipeFromText } from "./llm/llmExtractor.js";
import { ExtractionError, type ExtractionResult } from "./types.js";
import type { ExtractedRecipe } from "../shared/recipe.js";

async function extractFromWebsite(rawUrl: string): Promise<ExtractionResult> {
  const page = await fetchHtml(rawUrl);

  const candidates = findRecipeCandidates(page.html);
  const best = pickBestRecipeCandidate(candidates);
  if (best) {
    const recipe = normalizeRecipeNode(best, rawUrl, page.finalUrl);
    const lowConfidence = recipe.ingredients.length < 2 || recipe.instructions.length < 2;
    return { ok: true, recipe, extractionMethod: "json-ld", lowConfidence };
  }

  const fallback = extractWithFallback(page.html, rawUrl, page.finalUrl);
  if (fallback) {
    return {
      ok: true,
      recipe: fallback.recipe,
      extractionMethod: fallback.extractionMethod,
      lowConfidence: fallback.lowConfidence,
    };
  }

  return {
    ok: false,
    error: "no-recipe-found",
    message: "Couldn't find a recipe on that page.",
  };
}

/** Top-level entry point: detects the source type from the URL and routes to the matching extractor. */
export async function extractRecipe(rawUrl: string): Promise<ExtractionResult> {
  const sourceType = detectSourceType(rawUrl);

  try {
    if (sourceType === "youtube") {
      const { recipe, lowConfidence } = await extractFromYoutube(rawUrl);
      return { ok: true, recipe, extractionMethod: "llm-youtube", lowConfidence };
    }
    if (sourceType === "instagram") {
      const { recipe, lowConfidence } = await extractFromInstagram(rawUrl);
      return { ok: true, recipe, extractionMethod: "llm-instagram", lowConfidence };
    }
    return await extractFromWebsite(rawUrl);
  } catch (err) {
    if (err instanceof ExtractionError) {
      return { ok: false, error: err.code, message: err.message };
    }
    return {
      ok: false,
      error: "fetch-failed",
      message: err instanceof Error ? err.message : "Unknown extraction error.",
    };
  }
}

/** Runs manually-pasted text (e.g. an Instagram caption the user copied by hand) through the LLM extractor. */
export async function extractFromManualText(text: string, sourceUrl: string): Promise<ExtractionResult> {
  try {
    const fields = await extractRecipeFromText(text);
    if (fields.ingredients.length === 0 && fields.instructions.length === 0) {
      return { ok: false, error: "no-recipe-found", message: "That text doesn't appear to contain a recipe." };
    }
    const recipe: ExtractedRecipe = {
      title: fields.title ?? "Untitled recipe",
      image: null,
      author: null,
      description: text,
      ingredients: fields.ingredients,
      instructions: fields.instructions,
      prepTimeMinutes: fields.prepTimeMinutes,
      cookTimeMinutes: fields.cookTimeMinutes,
      totalTimeMinutes: fields.totalTimeMinutes,
      servings: fields.servings,
      sourceUrl,
    };
    return {
      ok: true,
      recipe,
      extractionMethod: "llm-manual",
      lowConfidence: fields.ingredients.length < 2 || fields.instructions.length < 2,
    };
  } catch (err) {
    if (err instanceof ExtractionError) {
      return { ok: false, error: err.code, message: err.message };
    }
    return { ok: false, error: "llm-error", message: err instanceof Error ? err.message : "Unknown LLM error." };
  }
}

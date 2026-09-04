import * as cheerio from "cheerio";
import { fetchHtml, validateUrl } from "../fetchHtml.js";
import { extractRecipeFromText } from "../llm/llmExtractor.js";
import { ExtractionError } from "../types.js";
import type { ExtractedRecipe } from "../../shared/recipe.js";

// Instagram's public og:description looks like: `12 likes, 3 comments - someuser on March 4, 2026: "Full caption text here"`
const CAPTION_PATTERN = /:\s*"([\s\S]*)"\s*$/;

// Generic copy Instagram serves to bots/logged-out requests instead of real post data.
const BLOCKED_MARKERS = [
  "see photos and videos from",
  "log in to see photos",
  "instagram.com/accounts/login",
];

function looksBlocked(description: string | null, html: string): boolean {
  if (!description) return true;
  const lower = description.toLowerCase();
  if (BLOCKED_MARKERS.some((marker) => lower.includes(marker))) return true;
  if (html.includes('id="loginForm"')) return true;
  return false;
}

function extractCaption(rawDescription: string): string {
  const match = CAPTION_PATTERN.exec(rawDescription);
  return match ? match[1]!.trim() : rawDescription.trim();
}

export interface InstagramExtractionResult {
  recipe: ExtractedRecipe;
  lowConfidence: boolean;
}

export async function extractFromInstagram(rawUrl: string): Promise<InstagramExtractionResult> {
  validateUrl(rawUrl);

  const page = await fetchHtml(rawUrl);
  const $ = cheerio.load(page.html);
  const ogDescription = $('meta[property="og:description"]').attr("content")?.trim() ?? null;
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() ?? null;
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() ?? null;

  if (looksBlocked(ogDescription, page.html)) {
    throw new ExtractionError(
      "instagram-blocked",
      "Instagram blocked automatic fetching for this post. Paste the caption text manually instead.",
    );
  }

  const caption = extractCaption(ogDescription!);
  const fields = await extractRecipeFromText(caption);

  if (fields.ingredients.length === 0 && fields.instructions.length === 0) {
    throw new ExtractionError("no-recipe-found", "The post caption doesn't appear to contain a recipe.");
  }

  const author = ogTitle ? ogTitle.replace(/\s*\(@.*?\)\s*/, " ").trim() || null : null;

  const recipe: ExtractedRecipe = {
    title: fields.title ?? "Untitled recipe",
    image: ogImage,
    author,
    description: caption,
    ingredients: fields.ingredients,
    instructions: fields.instructions,
    prepTimeMinutes: fields.prepTimeMinutes,
    cookTimeMinutes: fields.cookTimeMinutes,
    totalTimeMinutes: fields.totalTimeMinutes,
    servings: fields.servings,
    sourceUrl: rawUrl,
  };

  return {
    recipe,
    lowConfidence: fields.ingredients.length < 2 || fields.instructions.length < 2,
  };
}

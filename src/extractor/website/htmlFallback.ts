import * as cheerio from "cheerio";
import type { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import type { ExtractedRecipe } from "../../shared/recipe.js";
import { resolveUrl } from "./normalize.js";
import { parseIso8601DurationToMinutes } from "./durations.js";

export interface FallbackResult {
  recipe: ExtractedRecipe;
  extractionMethod: "microdata" | "heuristic";
  lowConfidence: boolean;
}

function itemPropTexts($: CheerioAPI, scope: Cheerio<AnyNode>, prop: string): string[] {
  return scope
    .find(`[itemprop="${prop}"]`)
    .map((_, el) => {
      const $el = $(el);
      return $el.attr("content") ?? $el.attr("datetime") ?? $el.text();
    })
    .get()
    .map((s) => s.trim())
    .filter(Boolean);
}

function tryMicrodata($: CheerioAPI, sourceUrl: string, pageUrl: string): FallbackResult | null {
  const container = $('[itemtype*="schema.org/Recipe" i]').first();
  if (container.length === 0) return null;

  const title = itemPropTexts($, container, "name")[0] ?? "";
  const image = container
    .find('[itemprop="image"]')
    .map((_, el) => {
      const $el = $(el);
      return $el.attr("src") ?? $el.attr("content") ?? $el.attr("href") ?? null;
    })
    .get()
    .find((v) => Boolean(v));
  const ingredients = itemPropTexts($, container, "recipeIngredient");
  const instructions = itemPropTexts($, container, "recipeInstructions");
  const author = itemPropTexts($, container, "author")[0] ?? null;
  const prepTimeMinutes = parseIso8601DurationToMinutes(itemPropTexts($, container, "prepTime")[0]);
  const cookTimeMinutes = parseIso8601DurationToMinutes(itemPropTexts($, container, "cookTime")[0]);
  const totalTimeMinutes = parseIso8601DurationToMinutes(itemPropTexts($, container, "totalTime")[0]);
  const servings = itemPropTexts($, container, "recipeYield")[0] ?? null;
  const description = itemPropTexts($, container, "description")[0] ?? null;

  if (!title && ingredients.length === 0 && instructions.length === 0) return null;

  const recipe: ExtractedRecipe = {
    title: title || "Untitled recipe",
    image: resolveUrl(image ?? null, pageUrl),
    author,
    description,
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings,
    sourceUrl,
  };

  return {
    recipe,
    extractionMethod: "microdata",
    lowConfidence: ingredients.length < 2 || instructions.length < 2,
  };
}

function findListByKeyword($: CheerioAPI, keywords: string[]): string[] {
  let found: string[] = [];

  $("[class], [id]").each((_, el) => {
    if (found.length > 0) return;
    const $el = $(el);
    const attrs = `${$el.attr("class") ?? ""} ${$el.attr("id") ?? ""}`.toLowerCase();
    if (keywords.some((k) => attrs.includes(k))) {
      const items = $el
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get()
        .filter(Boolean);
      if (items.length > 0) found = items;
    }
  });
  if (found.length > 0) return found;

  const headings = $("h1,h2,h3,h4,strong").toArray();
  for (const heading of headings) {
    const text = $(heading).text().toLowerCase();
    if (!keywords.some((k) => text.includes(k))) continue;

    const candidates = [$(heading).nextAll("ul,ol").first(), $(heading).parent().find("ul,ol").first()];
    for (const list of candidates) {
      if (list.length === 0) continue;
      const items = list
        .find("li")
        .map((_, li) => $(li).text().trim())
        .get()
        .filter(Boolean);
      if (items.length > 0) return items;
    }
  }
  return [];
}

/**
 * Best-effort extraction for pages with no JSON-LD Recipe: Microdata first,
 * then class/heading-keyword heuristics. Returns null if nothing usable was found at all.
 */
export function extractWithFallback(html: string, sourceUrl: string, pageUrl: string): FallbackResult | null {
  const $ = cheerio.load(html);

  const microdata = tryMicrodata($, sourceUrl, pageUrl);
  if (microdata) return microdata;

  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().trim() ||
    "";
  const image = $('meta[property="og:image"]').attr("content")?.trim() ?? null;
  const ingredients = findListByKeyword($, ["ingredient"]);
  const instructions = findListByKeyword($, ["instruction", "direction", "method", "steps"]);

  if (!title && ingredients.length === 0 && instructions.length === 0) return null;

  const recipe: ExtractedRecipe = {
    title: title || "Untitled recipe",
    image: resolveUrl(image, pageUrl),
    author: null,
    description: null,
    ingredients,
    instructions,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    totalTimeMinutes: null,
    servings: null,
    sourceUrl,
  };

  return {
    recipe,
    extractionMethod: "heuristic",
    lowConfidence: ingredients.length < 2 || instructions.length < 2,
  };
}

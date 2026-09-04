import type { ExtractedRecipe } from "../../shared/recipe.js";
import type { RawRecipeNode } from "./jsonLd.js";
import { parseIso8601DurationToMinutes } from "./durations.js";

function toImageUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const u = toImageUrl(v);
      if (u) return u;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj["url"] === "string") return obj["url"];
    if (typeof obj["contentUrl"] === "string") return obj["contentUrl"];
  }
  return null;
}

export function resolveUrl(url: string | null, baseUrl: string): string | null {
  if (!url) return null;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

function toAuthorName(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const name = toAuthorName(v);
      if (name) return name;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj["name"] === "string") return obj["name"].trim() || null;
  }
  return null;
}

function toServings(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = toServings(v);
      if (s) return s;
    }
    return null;
  }
  return null;
}

function toIngredients(node: RawRecipeNode): string[] {
  const raw = node["recipeIngredient"] ?? node["ingredients"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}

function nodeTypeIs(node: Record<string, unknown>, typeName: string): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === typeName;
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === typeName);
  return false;
}

/** Flattens schema.org recipeInstructions — string, string[], HowToStep[], or nested HowToSection[] — into an ordered string list. */
export function flattenInstructions(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) {
      if (typeof item === "string") {
        if (item.trim()) out.push(item.trim());
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (nodeTypeIs(obj, "howtosection") && Array.isArray(obj["itemListElement"])) {
          out.push(...flattenInstructions(obj["itemListElement"]));
        } else if (typeof obj["text"] === "string" && obj["text"].trim()) {
          out.push(obj["text"].trim());
        } else if (typeof obj["name"] === "string" && obj["name"].trim()) {
          out.push(obj["name"].trim());
        }
      }
    }
    return out;
  }
  return [];
}

/** Maps a raw schema.org Recipe JSON-LD node into the app's internal Recipe model. */
export function normalizeRecipeNode(node: RawRecipeNode, sourceUrl: string, pageUrl: string): ExtractedRecipe {
  const title = typeof node["name"] === "string" ? node["name"].trim() : "";

  return {
    title: title || "Untitled recipe",
    image: resolveUrl(toImageUrl(node["image"]), pageUrl),
    author: toAuthorName(node["author"]),
    description: typeof node["description"] === "string" ? node["description"].trim() : null,
    ingredients: toIngredients(node),
    instructions: flattenInstructions(node["recipeInstructions"]),
    prepTimeMinutes: parseIso8601DurationToMinutes(node["prepTime"]),
    cookTimeMinutes: parseIso8601DurationToMinutes(node["cookTime"]),
    totalTimeMinutes: parseIso8601DurationToMinutes(node["totalTime"]),
    servings: toServings(node["recipeYield"]),
    sourceUrl,
  };
}

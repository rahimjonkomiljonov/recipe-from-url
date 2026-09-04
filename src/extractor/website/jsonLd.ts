import * as cheerio from "cheerio";

/** A raw, unvalidated JSON-LD node that looks like a schema.org Recipe (still needs normalization). */
export type RawRecipeNode = Record<string, unknown>;

const MAX_DEPTH = 6;
const MAX_NODES_VISITED = 2000;

function typeMatches(node: RawRecipeNode): boolean {
  const type = node["@type"];
  if (typeof type === "string") return type.toLowerCase() === "recipe";
  if (Array.isArray(type)) return type.some((t) => typeof t === "string" && t.toLowerCase() === "recipe");
  return false;
}

interface WalkState {
  visited: number;
  out: RawRecipeNode[];
}

function walk(node: unknown, depth: number, state: WalkState): void {
  if (state.visited > MAX_NODES_VISITED || depth > MAX_DEPTH) return;
  state.visited++;

  if (Array.isArray(node)) {
    for (const item of node) walk(item, depth, state);
    return;
  }

  if (node && typeof node === "object") {
    const obj = node as RawRecipeNode;
    if (typeMatches(obj)) {
      state.out.push(obj);
    }
    for (const value of Object.values(obj)) {
      walk(value, depth + 1, state);
    }
  }
}

/** Finds every schema.org Recipe node embedded as JSON-LD anywhere on the page. */
export function findRecipeCandidates(html: string): RawRecipeNode[] {
  const $ = cheerio.load(html);
  const state: WalkState = { visited: 0, out: [] };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw || !raw.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return; // malformed block — skip, don't abort the whole page
    }
    walk(parsed, 0, state);
  });

  return state.out;
}

function fieldScore(node: RawRecipeNode): number {
  let score = 0;
  const ingredients = node["recipeIngredient"] ?? node["ingredients"];
  const instructions = node["recipeInstructions"];
  if (Array.isArray(ingredients) && ingredients.length > 0) score += 10;
  if ((Array.isArray(instructions) && instructions.length > 0) || typeof instructions === "string") score += 10;
  for (const value of Object.values(node)) {
    if (value !== null && value !== undefined && value !== "") score += 1;
  }
  return score;
}

/** Picks the most complete Recipe candidate when a page embeds more than one. */
export function pickBestRecipeCandidate(candidates: RawRecipeNode[]): RawRecipeNode | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => (fieldScore(current) > fieldScore(best) ? current : best));
}

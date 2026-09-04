import type { ApiError, ExtractApiResponse, Recipe, RecipeInput } from "./types.js";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function handle<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = body as ApiError;
    throw new ApiRequestError(err.message || `Request failed with status ${response.status}`, err.error ?? "unknown");
  }
  return body as T;
}

export function extractFromUrl(url: string): Promise<ExtractApiResponse> {
  return fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).then((r) => handle<ExtractApiResponse>(r));
}

export function extractFromText(text: string, sourceUrl?: string): Promise<ExtractApiResponse> {
  return fetch("/api/extract-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceUrl }),
  }).then((r) => handle<ExtractApiResponse>(r));
}

export function saveRecipe(input: RecipeInput): Promise<{ recipe: Recipe }> {
  return fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((r) => handle<{ recipe: Recipe }>(r));
}

export function listRecipes(q?: string): Promise<{ recipes: Recipe[] }> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return fetch(`/api/recipes${query}`).then((r) => handle<{ recipes: Recipe[] }>(r));
}

export function getRecipe(id: number): Promise<{ recipe: Recipe }> {
  return fetch(`/api/recipes/${id}`).then((r) => handle<{ recipe: Recipe }>(r));
}

export function deleteRecipe(id: number): Promise<void> {
  return fetch(`/api/recipes/${id}`, { method: "DELETE" }).then((r) => {
    if (!r.ok && r.status !== 204) throw new Error(`Delete failed with status ${r.status}`);
  });
}

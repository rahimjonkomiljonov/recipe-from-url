import type { ExtractedRecipe, ExtractionMethod } from "../shared/recipe.js";

export type ExtractionErrorCode =
  | "invalid-url"
  | "fetch-failed"
  | "timeout"
  | "not-html"
  | "no-recipe-found"
  | "instagram-blocked"
  | "llm-not-configured"
  | "llm-rate-limited"
  | "llm-error";

export interface ExtractionSuccess {
  ok: true;
  recipe: ExtractedRecipe;
  extractionMethod: ExtractionMethod;
  lowConfidence: boolean;
}

export interface ExtractionFailure {
  ok: false;
  error: ExtractionErrorCode;
  message: string;
}

export type ExtractionResult = ExtractionSuccess | ExtractionFailure;

export class ExtractionError extends Error {
  constructor(
    public readonly code: ExtractionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

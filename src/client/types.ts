export type SourceType = "website" | "youtube" | "instagram" | "manual";

export type ExtractionMethod =
  | "json-ld"
  | "microdata"
  | "heuristic"
  | "llm-youtube"
  | "llm-instagram"
  | "llm-manual";

export interface ExtractedRecipe {
  title: string;
  image: string | null;
  author: string | null;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  servings: string | null;
  sourceUrl: string;
}

export interface Recipe extends ExtractedRecipe {
  id: number;
  sourceType: SourceType;
  extractionMethod: ExtractionMethod | null;
  savedAt: string;
}

export interface RecipeInput extends ExtractedRecipe {
  sourceType: SourceType;
  extractionMethod: ExtractionMethod | null;
}

export interface ExtractApiResponse {
  recipe: ExtractedRecipe;
  extractionMethod: ExtractionMethod;
  lowConfidence: boolean;
  existingSaves: { id: number; savedAt: string }[];
}

export interface ApiError {
  error: string;
  message: string;
}

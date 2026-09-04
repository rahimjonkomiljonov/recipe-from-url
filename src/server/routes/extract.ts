import { Router } from "express";
import { extractRecipe } from "../../extractor/extractRecipe.js";
import { findBySourceUrl } from "../../db/recipesRepo.js";
import type { ExtractionErrorCode } from "../../extractor/types.js";

const ERROR_STATUS: Record<ExtractionErrorCode, number> = {
  "invalid-url": 400,
  "not-html": 422,
  "no-recipe-found": 404,
  "instagram-blocked": 422,
  "llm-not-configured": 503,
  "llm-rate-limited": 429,
  "llm-error": 502,
  "fetch-failed": 502,
  timeout: 504,
};

export const extractRouter = Router();

extractRouter.post("/", async (req, res) => {
  const url = req.body?.url;
  if (typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "invalid-url", message: "A URL is required." });
    return;
  }

  const result = await extractRecipe(url.trim());

  if (!result.ok) {
    res.status(ERROR_STATUS[result.error] ?? 500).json({ error: result.error, message: result.message });
    return;
  }

  const existingSaves = findBySourceUrl(result.recipe.sourceUrl).map((r) => ({ id: r.id, savedAt: r.savedAt }));

  res.status(200).json({
    recipe: result.recipe,
    extractionMethod: result.extractionMethod,
    lowConfidence: result.lowConfidence,
    existingSaves,
  });
});

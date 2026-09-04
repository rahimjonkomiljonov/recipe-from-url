import { Router } from "express";
import { extractFromManualText } from "../../extractor/extractRecipe.js";
import { findBySourceUrl } from "../../db/recipesRepo.js";
import type { ExtractionErrorCode } from "../../extractor/types.js";

const ERROR_STATUS: Partial<Record<ExtractionErrorCode, number>> = {
  "no-recipe-found": 404,
  "llm-not-configured": 503,
  "llm-rate-limited": 429,
  "llm-error": 502,
};

export const extractTextRouter = Router();

extractTextRouter.post("/", async (req, res) => {
  const text = req.body?.text;
  const sourceUrl = typeof req.body?.sourceUrl === "string" ? req.body.sourceUrl.trim() : "";

  if (typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "invalid-url", message: "Recipe text is required." });
    return;
  }

  const result = await extractFromManualText(text.trim(), sourceUrl);

  if (!result.ok) {
    res.status(ERROR_STATUS[result.error] ?? 500).json({ error: result.error, message: result.message });
    return;
  }

  const existingSaves = sourceUrl
    ? findBySourceUrl(sourceUrl).map((r) => ({ id: r.id, savedAt: r.savedAt }))
    : [];

  res.status(200).json({
    recipe: result.recipe,
    extractionMethod: result.extractionMethod,
    lowConfidence: result.lowConfidence,
    existingSaves,
  });
});

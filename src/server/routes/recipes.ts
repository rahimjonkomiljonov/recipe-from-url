import { Router } from "express";
import { insertRecipe, listRecipes, getRecipeById, deleteRecipe } from "../../db/recipesRepo.js";
import type { RecipeInput, SourceType, ExtractionMethod } from "../../shared/recipe.js";

export const recipesRouter = Router();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

recipesRouter.post("/", (req, res) => {
  const body = req.body ?? {};

  if (typeof body.title !== "string" || !body.title.trim()) {
    res.status(400).json({ error: "invalid-input", message: "A title is required." });
    return;
  }
  if (!isStringArray(body.ingredients) || body.ingredients.length === 0) {
    res.status(400).json({ error: "invalid-input", message: "At least one ingredient is required." });
    return;
  }
  if (!isStringArray(body.instructions) || body.instructions.length === 0) {
    res.status(400).json({ error: "invalid-input", message: "At least one instruction is required." });
    return;
  }
  if (typeof body.sourceUrl !== "string" || !body.sourceUrl.trim()) {
    res.status(400).json({ error: "invalid-input", message: "A source URL is required." });
    return;
  }

  const input: RecipeInput = {
    title: body.title.trim(),
    image: typeof body.image === "string" ? body.image : null,
    author: typeof body.author === "string" ? body.author : null,
    description: typeof body.description === "string" ? body.description : null,
    ingredients: body.ingredients,
    instructions: body.instructions,
    prepTimeMinutes: typeof body.prepTimeMinutes === "number" ? body.prepTimeMinutes : null,
    cookTimeMinutes: typeof body.cookTimeMinutes === "number" ? body.cookTimeMinutes : null,
    totalTimeMinutes: typeof body.totalTimeMinutes === "number" ? body.totalTimeMinutes : null,
    servings: typeof body.servings === "string" ? body.servings : null,
    sourceUrl: body.sourceUrl.trim(),
    sourceType: (typeof body.sourceType === "string" ? body.sourceType : "website") as SourceType,
    extractionMethod: (body.extractionMethod ?? null) as ExtractionMethod | null,
  };

  const recipe = insertRecipe(input);
  res.status(201).json({ recipe });
});

recipesRouter.get("/", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  res.status(200).json({ recipes: listRecipes({ q }) });
});

recipesRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const recipe = getRecipeById(id);
  if (!recipe) {
    res.status(404).json({ error: "not-found", message: "No recipe with that id." });
    return;
  }
  res.status(200).json({ recipe });
});

recipesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const deleted = deleteRecipe(id);
  if (!deleted) {
    res.status(404).json({ error: "not-found", message: "No recipe with that id." });
    return;
  }
  res.status(204).send();
});

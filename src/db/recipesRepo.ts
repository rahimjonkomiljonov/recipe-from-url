import { db } from "./connection.js";
import type { Recipe, RecipeInput } from "../shared/recipe.js";

interface RecipeRow {
  id: number;
  title: string;
  image: string | null;
  author: string | null;
  description: string | null;
  ingredients_json: string;
  instructions_json: string;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: string | null;
  source_url: string;
  source_type: string | null;
  extraction_method: string | null;
  saved_at: string;
}

function rowToRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    image: row.image,
    author: row.author,
    description: row.description,
    ingredients: JSON.parse(row.ingredients_json) as string[],
    instructions: JSON.parse(row.instructions_json) as string[],
    prepTimeMinutes: row.prep_time_minutes,
    cookTimeMinutes: row.cook_time_minutes,
    totalTimeMinutes: row.total_time_minutes,
    servings: row.servings,
    sourceUrl: row.source_url,
    sourceType: (row.source_type ?? "website") as Recipe["sourceType"],
    extractionMethod: row.extraction_method as Recipe["extractionMethod"],
    savedAt: row.saved_at,
  };
}

const insertStmt = db.prepare(`
  INSERT INTO recipes (
    title, image, author, description, ingredients_json, instructions_json,
    prep_time_minutes, cook_time_minutes, total_time_minutes, servings,
    source_url, source_type, extraction_method, saved_at
  ) VALUES (
    @title, @image, @author, @description, @ingredients_json, @instructions_json,
    @prep_time_minutes, @cook_time_minutes, @total_time_minutes, @servings,
    @source_url, @source_type, @extraction_method, @saved_at
  )
`);

export function insertRecipe(input: RecipeInput): Recipe {
  const savedAt = new Date().toISOString();
  const result = insertStmt.run({
    title: input.title,
    image: input.image,
    author: input.author,
    description: input.description,
    ingredients_json: JSON.stringify(input.ingredients),
    instructions_json: JSON.stringify(input.instructions),
    prep_time_minutes: input.prepTimeMinutes,
    cook_time_minutes: input.cookTimeMinutes,
    total_time_minutes: input.totalTimeMinutes,
    servings: input.servings,
    source_url: input.sourceUrl,
    source_type: input.sourceType,
    extraction_method: input.extractionMethod,
    saved_at: savedAt,
  });
  const row = getRowById(Number(result.lastInsertRowid));
  if (!row) throw new Error("Failed to read back inserted recipe.");
  return rowToRecipe(row);
}

function getRowById(id: number): RecipeRow | undefined {
  return db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as RecipeRow | undefined;
}

export function getRecipeById(id: number): Recipe | undefined {
  const row = getRowById(id);
  return row ? rowToRecipe(row) : undefined;
}

export function listRecipes(query?: { q?: string }): Recipe[] {
  const q = query?.q?.trim();
  const rows = q
    ? (db
        .prepare("SELECT * FROM recipes WHERE title LIKE ? ORDER BY saved_at DESC")
        .all(`%${q}%`) as RecipeRow[])
    : (db.prepare("SELECT * FROM recipes ORDER BY saved_at DESC").all() as RecipeRow[]);
  return rows.map(rowToRecipe);
}

export function deleteRecipe(id: number): boolean {
  const result = db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
  return result.changes > 0;
}

export function findBySourceUrl(sourceUrl: string): Recipe[] {
  const rows = db
    .prepare("SELECT * FROM recipes WHERE source_url = ? ORDER BY saved_at DESC")
    .all(sourceUrl) as RecipeRow[];
  return rows.map(rowToRecipe);
}

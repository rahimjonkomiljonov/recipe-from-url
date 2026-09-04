import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "..", "data", "recipes.sqlite");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Runs as soon as anything imports the connection, so the table always exists
// before recipesRepo's top-level `db.prepare(...)` calls run (module evaluation
// order means those would otherwise fire before an explicit migrate() call could).
db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    title              TEXT NOT NULL,
    image              TEXT,
    author             TEXT,
    description        TEXT,
    ingredients_json   TEXT NOT NULL,
    instructions_json  TEXT NOT NULL,
    prep_time_minutes  INTEGER,
    cook_time_minutes  INTEGER,
    total_time_minutes INTEGER,
    servings           TEXT,
    source_url         TEXT NOT NULL,
    source_type        TEXT,
    extraction_method  TEXT,
    saved_at           TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
  CREATE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url);
`);

import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractRouter } from "./routes/extract.js";
import { extractTextRouter } from "./routes/extractText.js";
import { recipesRouter } from "./routes/recipes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/extract", extractRouter);
  app.use("/api/extract-text", extractTextRouter);
  app.use("/api/recipes", recipesRouter);

  app.use("/client", express.static(join(PROJECT_ROOT, "dist", "client")));
  app.use(express.static(join(PROJECT_ROOT, "public")));

  return app;
}

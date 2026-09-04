import { fetchHtml, validateUrl } from "../fetchHtml.js";
import { extractRecipeFromText, extractRecipeFromVideo, type LlmExtractionFields } from "../llm/llmExtractor.js";
import { ExtractionError } from "../types.js";
import type { ExtractedRecipe } from "../../shared/recipe.js";

interface OEmbedData {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

async function fetchOEmbed(videoUrl: string): Promise<OEmbedData | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    return (await response.json()) as OEmbedData;
  } catch {
    return null;
  }
}

function extractFullDescription(html: string): { description: string | null; truncated: boolean } {
  const match = /var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s.exec(html);
  if (match) {
    try {
      const data = JSON.parse(match[1]!);
      const shortDescription = data?.videoDetails?.shortDescription;
      if (typeof shortDescription === "string" && shortDescription.trim()) {
        return { description: shortDescription, truncated: false };
      }
    } catch {
      // fall through to meta-tag fallback
    }
  }

  const metaMatch = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
  if (metaMatch) {
    const decoded = metaMatch[1]!
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    if (decoded.trim()) return { description: decoded, truncated: true };
  }

  return { description: null, truncated: false };
}

function hasRecipeContent(fields: LlmExtractionFields): boolean {
  return fields.ingredients.length > 0 || fields.instructions.length > 0;
}

export interface YoutubeExtractionResult {
  recipe: ExtractedRecipe;
  lowConfidence: boolean;
}

export async function extractFromYoutube(rawUrl: string): Promise<YoutubeExtractionResult> {
  validateUrl(rawUrl);

  // Fetch metadata (thumbnail/author) and the description in parallel with the
  // video-watching call below — cheap and fast, so it doesn't add latency, and
  // gives us a description to display and a fallback source if watching fails.
  const [oembed, page] = await Promise.all([fetchOEmbed(rawUrl), fetchHtml(rawUrl).catch(() => null)]);
  const { description } = page ? extractFullDescription(page.html) : { description: null };

  // A thrown error here (rate-limited, timeout, missing API key) is a real,
  // actionable failure — let it propagate as-is rather than masking it behind
  // a generic "no recipe found", which would wrongly suggest trying a
  // different video instead of the actual fix (e.g. waiting and retrying).
  // Only a *successful* call that found nothing triggers the description fallback.
  let fields = await extractRecipeFromVideo(rawUrl);
  let usedDescriptionFallback = false;

  if (!hasRecipeContent(fields) && description) {
    fields = await extractRecipeFromText(description);
    usedDescriptionFallback = true;
  }

  if (!hasRecipeContent(fields)) {
    throw new ExtractionError("no-recipe-found", "Couldn't find a recipe in this video or its description.");
  }

  const recipe: ExtractedRecipe = {
    title: fields.title ?? oembed?.title ?? "Untitled recipe",
    image: oembed?.thumbnail_url ?? null,
    author: oembed?.author_name ?? null,
    description,
    ingredients: fields.ingredients,
    instructions: fields.instructions,
    prepTimeMinutes: fields.prepTimeMinutes,
    cookTimeMinutes: fields.cookTimeMinutes,
    totalTimeMinutes: fields.totalTimeMinutes,
    servings: fields.servings,
    sourceUrl: rawUrl,
  };

  return {
    recipe,
    lowConfidence: usedDescriptionFallback || fields.ingredients.length < 2 || fields.instructions.length < 2,
  };
}

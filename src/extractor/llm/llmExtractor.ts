import { ExtractionError } from "../types.js";

const MODEL = "gemini-3.8-flash";
const LLM_TIMEOUT_MS = 45_000;
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export interface LlmExtractionFields {
  title: string | null;
  ingredients: string[];
  instructions: string[];
  servings: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
}

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "The recipe's title, if mentioned." },
    ingredients: {
      type: "array",
      items: { type: "string" },
      description: "Each ingredient as its own list item, as stated in the source.",
    },
    instructions: {
      type: "array",
      items: { type: "string" },
      description: "Each cooking step as its own ordered list item, as stated in the source.",
    },
    servings: { type: "string" },
    prepTimeMinutes: { type: "number" },
    cookTimeMinutes: { type: "number" },
    totalTimeMinutes: { type: "number" },
  },
  required: ["ingredients", "instructions"],
};

const TEXT_SYSTEM_INSTRUCTION = `You extract recipe information from free-form text (a video description or social media caption).
Only extract what is actually present in the text — omit anything not mentioned, don't guess.
Do not invent, guess, or embellish ingredients or steps that aren't in the source text. This is extraction, not generation.`;

const VIDEO_SYSTEM_INSTRUCTION = `You extract recipe information from a cooking video by watching it.
Use both what is said aloud and any on-screen text/captions. Only include what is actually shown or said — omit anything not mentioned, don't guess or invent.`;

const VIDEO_PROMPT =
  "Watch this cooking video and extract its recipe: the title (as stated or shown, not the channel/upload title), every ingredient with the quantity as stated, and each step in order.";

type InteractionInputPart = { type: "text"; text: string } | { type: "video"; uri: string };

interface InteractionRequestBody {
  model: string;
  input: string | InteractionInputPart[];
  system_instruction?: string;
  response_format: {
    type: "text";
    mime_type: "application/json";
    schema: typeof RESPONSE_JSON_SCHEMA;
  };
}

interface InteractionResponseBody {
  status?: string;
  steps?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new ExtractionError(
      "llm-not-configured",
      "Add GEMINI_API_KEY to your .env file to enable extraction from YouTube/Instagram.",
    );
  }
  return apiKey;
}

function extractOutputText(body: InteractionResponseBody): string | null {
  for (const step of body.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const part of step.content ?? []) {
      if (part.type === "text" && typeof part.text === "string") return part.text;
    }
  }
  return null;
}

async function runInteraction(
  input: InteractionRequestBody["input"],
  systemInstruction: string,
): Promise<LlmExtractionFields> {
  const apiKey = getApiKey();

  const body: InteractionRequestBody = {
    model: MODEL,
    input,
    system_instruction: systemInstruction,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESPONSE_JSON_SCHEMA,
    },
  };

  let response: Response;
  try {
    response = await fetch(INTERACTIONS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new ExtractionError("llm-error", "The Gemini request took too long to respond.");
    }
    throw new ExtractionError("llm-error", `Gemini extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = errBody?.error?.message ?? `Gemini request failed with status ${response.status}.`;
    if (response.status === 429) {
      throw new ExtractionError("llm-rate-limited", "Gemini's free-tier rate limit was hit — try again in a moment.");
    }
    throw new ExtractionError("llm-error", `Gemini extraction failed: ${message}`);
  }

  const responseBody = (await response.json()) as InteractionResponseBody;
  const raw = extractOutputText(responseBody);
  if (!raw) {
    throw new ExtractionError("llm-error", "Gemini returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ExtractionError("llm-error", "Gemini's response could not be parsed as JSON.");
  }

  return normalizeLlmFields(parsed);
}

/** Sends free-form recipe text (description/caption) to Gemini and returns structured fields. */
export function extractRecipeFromText(text: string): Promise<LlmExtractionFields> {
  return runInteraction(text, TEXT_SYSTEM_INSTRUCTION);
}

/** Has Gemini watch a public YouTube video directly (audio + visuals) and extract its recipe. */
export function extractRecipeFromVideo(videoUrl: string): Promise<LlmExtractionFields> {
  return runInteraction([{ type: "video", uri: videoUrl }, { type: "text", text: VIDEO_PROMPT }], VIDEO_SYSTEM_INSTRUCTION);
}

function normalizeLlmFields(parsed: unknown): LlmExtractionFields {
  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim()) : [];

  return {
    title: typeof obj["title"] === "string" && obj["title"].trim() ? obj["title"].trim() : null,
    ingredients: toStringArray(obj["ingredients"]),
    instructions: toStringArray(obj["instructions"]),
    servings: typeof obj["servings"] === "string" && obj["servings"].trim() ? obj["servings"].trim() : null,
    prepTimeMinutes: typeof obj["prepTimeMinutes"] === "number" ? obj["prepTimeMinutes"] : null,
    cookTimeMinutes: typeof obj["cookTimeMinutes"] === "number" ? obj["cookTimeMinutes"] : null,
    totalTimeMinutes: typeof obj["totalTimeMinutes"] === "number" ? obj["totalTimeMinutes"] : null,
  };
}

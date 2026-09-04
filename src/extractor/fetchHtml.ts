import { ExtractionError } from "./types.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface FetchedPage {
  html: string;
  finalUrl: string;
}

/** Validates a pasted URL, rejecting anything that isn't http(s). Throws ExtractionError("invalid-url"). */
export function validateUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ExtractionError("invalid-url", "That doesn't look like a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ExtractionError("invalid-url", "Only http(s) URLs are supported.");
  }
  return url;
}

/**
 * Fetches a page's HTML with a realistic User-Agent, a timeout, and a size cap.
 * Throws ExtractionError with code "timeout" | "fetch-failed" | "not-html".
 */
export async function fetchHtml(rawUrl: string, options?: { headers?: Record<string, string> }): Promise<FetchedPage> {
  const url = validateUrl(rawUrl);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new ExtractionError("timeout", "The site took too long to respond.");
    }
    throw new ExtractionError(
      "fetch-failed",
      `Could not reach that URL (${err instanceof Error ? err.message : "unknown error"}).`,
    );
  }

  if (!response.ok) {
    throw new ExtractionError("fetch-failed", `The site responded with status ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new ExtractionError("not-html", `That URL did not return an HTML page (got "${contentType || "unknown"}").`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BYTES) {
    throw new ExtractionError("fetch-failed", "That page is too large to process.");
  }

  const html = await readBodyCapped(response, MAX_BYTES);
  return { html, finalUrl: response.url || rawUrl };
}

async function readBodyCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return response.text();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ExtractionError("fetch-failed", "That page is too large to process.");
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

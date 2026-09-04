import type { SourceType } from "../shared/recipe.js";

/** Detects which extractor should handle a pasted URL, based on hostname. */
export function detectSourceType(rawUrl: string): SourceType {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return "website";
  }

  const host = hostname.replace(/^(www\.|m\.)/, "");

  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") {
    return "youtube";
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    return "instagram";
  }
  return "website";
}

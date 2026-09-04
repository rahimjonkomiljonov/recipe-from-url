import { extractFromUrl, extractFromText, saveRecipe, ApiRequestError } from "../api.js";
import { clear, el, formatDate, sourceTypeBadgeLabel } from "../dom.js";
import type { ExtractApiResponse, ExtractedRecipe, ExtractionMethod, SourceType } from "../types.js";

function sourceTypeFromExtractionMethod(method: ExtractionMethod): SourceType {
  switch (method) {
    case "llm-youtube":
      return "youtube";
    case "llm-instagram":
      return "instagram";
    case "llm-manual":
      return "manual";
    default:
      return "website";
  }
}

export function renderExtractView(container: HTMLElement): void {
  clear(container);

  const urlInput = el("input", { type: "text", placeholder: "Paste a recipe, YouTube, or Instagram URL…", class: "url-input" });
  const extractBtn = el("button", { class: "btn btn-primary" }, ["Extract"]);
  const status = el("div", { class: "status" });
  const resultArea = el("div", { class: "result-area" });

  const form = el("div", { class: "extract-form" }, [urlInput, extractBtn]);
  container.append(el("section", { class: "card" }, [el("h1", {}, ["New Recipe"]), form, status, resultArea]));

  async function runExtract(url: string) {
    clear(status);
    clear(resultArea);
    status.append("Extracting…");
    extractBtn.setAttribute("disabled", "true");
    try {
      const response = await extractFromUrl(url);
      clear(status);
      renderResult(resultArea, response, url);
    } catch (err) {
      clear(status);
      const message = err instanceof Error ? err.message : "Extraction failed.";
      const code = err instanceof ApiRequestError ? err.code : undefined;
      renderError(resultArea, message, url, code);
    } finally {
      extractBtn.removeAttribute("disabled");
    }
  }

  extractBtn.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (url) void runExtract(url);
  });
  urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") extractBtn.click();
  });
}

function renderError(resultArea: HTMLElement, message: string, sourceUrl: string, errorCode: string | undefined): void {
  clear(resultArea);
  const box = el("div", { class: "banner banner-error" }, [message]);
  resultArea.append(box);

  if (errorCode === "instagram-blocked") {
    const textarea = el("textarea", { rows: "6", placeholder: "Paste the post caption here…", class: "manual-textarea" });
    const btn = el("button", { class: "btn btn-secondary" }, ["Extract from pasted text"]);
    const manualStatus = el("div", { class: "status" });

    btn.addEventListener("click", async () => {
      const text = (textarea as HTMLTextAreaElement).value.trim();
      if (!text) return;
      clear(manualStatus);
      manualStatus.append("Extracting…");
      try {
        const response = await extractFromText(text, sourceUrl);
        clear(manualStatus);
        renderResult(resultArea, response, sourceUrl);
      } catch (err) {
        clear(manualStatus);
        manualStatus.append(err instanceof Error ? err.message : "Extraction failed.");
      }
    });

    resultArea.append(el("div", { class: "manual-fallback" }, [textarea, btn, manualStatus]));
  }
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderResult(resultArea: HTMLElement, response: ExtractApiResponse, sourceUrl: string): void {
  clear(resultArea);
  const { recipe, extractionMethod, lowConfidence, existingSaves } = response;
  const sourceType = sourceTypeFromExtractionMethod(extractionMethod);

  const badges = el("div", { class: "badges" }, [
    el("span", { class: "badge" }, [`Detected: ${sourceTypeBadgeLabel(sourceType)}`]),
  ]);

  const banners: HTMLElement[] = [];
  if (lowConfidence) {
    banners.push(
      el("div", { class: "banner banner-warning" }, [
        "Auto-extraction may be incomplete for this source — please review and edit before saving.",
      ]),
    );
  }
  if (existingSaves.length > 0) {
    const last = existingSaves[0]!;
    banners.push(
      el("div", { class: "banner banner-info" }, [
        `You already saved a recipe from this URL on ${formatDate(last.savedAt)}. `,
        el("a", { href: `#/recipe/${last.id}` }, ["View it"]),
        " — saving again will add a new entry.",
      ]),
    );
  }

  const titleInput = el("input", { type: "text", value: recipe.title, class: "field-input" });
  const imageInput = el("input", { type: "text", value: recipe.image ?? "", class: "field-input" });
  const authorInput = el("input", { type: "text", value: recipe.author ?? "", class: "field-input" });
  const descriptionInput = el("textarea", { rows: "3", class: "field-textarea" }, [recipe.description ?? ""]);
  const ingredientsInput = el("textarea", { rows: "8", class: "field-textarea" }, [recipe.ingredients.join("\n")]);
  const instructionsInput = el("textarea", { rows: "10", class: "field-textarea" }, [recipe.instructions.join("\n")]);
  const servingsInput = el("input", { type: "text", value: recipe.servings ?? "", class: "field-input-small" });
  const prepInput = el("input", { type: "number", value: recipe.prepTimeMinutes?.toString() ?? "", class: "field-input-small" });
  const cookInput = el("input", { type: "number", value: recipe.cookTimeMinutes?.toString() ?? "", class: "field-input-small" });
  const totalInput = el("input", { type: "number", value: recipe.totalTimeMinutes?.toString() ?? "", class: "field-input-small" });

  const preview = imageInput.value
    ? el("img", { src: imageInput.value, class: "preview-image", alt: "" })
    : el("div", { class: "preview-image preview-image-empty" });

  const saveBtn = el("button", { class: "btn btn-primary" }, ["Save recipe"]);
  const saveStatus = el("div", { class: "status" });

  saveBtn.addEventListener("click", async () => {
    const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
    const input: ExtractedRecipe & { sourceType: SourceType; extractionMethod: ExtractionMethod } = {
      title: (titleInput as HTMLInputElement).value.trim() || "Untitled recipe",
      image: (imageInput as HTMLInputElement).value.trim() || null,
      author: (authorInput as HTMLInputElement).value.trim() || null,
      description: (descriptionInput as HTMLTextAreaElement).value.trim() || null,
      ingredients: linesToList((ingredientsInput as HTMLTextAreaElement).value),
      instructions: linesToList((instructionsInput as HTMLTextAreaElement).value),
      prepTimeMinutes: numOrNull((prepInput as HTMLInputElement).value),
      cookTimeMinutes: numOrNull((cookInput as HTMLInputElement).value),
      totalTimeMinutes: numOrNull((totalInput as HTMLInputElement).value),
      servings: (servingsInput as HTMLInputElement).value.trim() || null,
      sourceUrl,
      sourceType,
      extractionMethod,
    };

    if (input.ingredients.length === 0 || input.instructions.length === 0) {
      clear(saveStatus);
      saveStatus.append("At least one ingredient and one instruction are required.");
      return;
    }

    saveBtn.setAttribute("disabled", "true");
    clear(saveStatus);
    saveStatus.append("Saving…");
    try {
      const { recipe: saved } = await saveRecipe(input);
      location.hash = `#/recipe/${saved.id}`;
    } catch (err) {
      clear(saveStatus);
      saveStatus.append(err instanceof Error ? err.message : "Save failed.");
    } finally {
      saveBtn.removeAttribute("disabled");
    }
  });

  resultArea.append(
    badges,
    ...banners,
    el("div", { class: "preview-form" }, [
      preview,
      el("label", {}, ["Title", titleInput]),
      el("label", {}, ["Image URL", imageInput]),
      el("label", {}, ["Author", authorInput]),
      el("label", {}, ["Description", descriptionInput]),
      el("div", { class: "field-row" }, [
        el("label", {}, ["Servings", servingsInput]),
        el("label", {}, ["Prep (min)", prepInput]),
        el("label", {}, ["Cook (min)", cookInput]),
        el("label", {}, ["Total (min)", totalInput]),
      ]),
      el("label", {}, ["Ingredients (one per line)", ingredientsInput]),
      el("label", {}, ["Instructions (one per line)", instructionsInput]),
      saveBtn,
      saveStatus,
    ]),
  );
}

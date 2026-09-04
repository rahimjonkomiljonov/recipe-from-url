import { listRecipes, deleteRecipe } from "../api.js";
import { clear, el, formatDate, sourceTypeBadgeLabel } from "../dom.js";
import type { Recipe } from "../types.js";

export function renderSavedListView(container: HTMLElement): void {
  clear(container);

  const searchInput = el("input", { type: "text", placeholder: "Search saved recipes…", class: "url-input" });
  const listEl = el("div", { class: "recipe-grid" });
  const status = el("div", { class: "status" });

  container.append(
    el("section", { class: "card" }, [el("h1", {}, ["Saved Recipes"]), searchInput, status, listEl]),
  );

  let debounceTimer: number | undefined;
  searchInput.addEventListener("input", () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => void load((searchInput as HTMLInputElement).value.trim()), 250);
  });

  async function load(q?: string) {
    clear(status);
    status.append("Loading…");
    try {
      const { recipes } = await listRecipes(q || undefined);
      clear(status);
      renderList(listEl, recipes, () => void load((searchInput as HTMLInputElement).value.trim()));
    } catch (err) {
      clear(status);
      status.append(err instanceof Error ? err.message : "Failed to load recipes.");
    }
  }

  void load();
}

function renderList(listEl: HTMLElement, recipes: Recipe[], onDeleted: () => void): void {
  clear(listEl);

  if (recipes.length === 0) {
    listEl.append(el("p", { class: "empty" }, ["No saved recipes yet."]));
    return;
  }

  for (const recipe of recipes) {
    const thumb = recipe.image
      ? el("img", { src: recipe.image, class: "card-thumb", alt: "" })
      : el("div", { class: "card-thumb card-thumb-empty" });

    const deleteBtn = el("button", { class: "btn btn-danger btn-small" }, ["Delete"]);
    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete "${recipe.title}"?`)) return;
      await deleteRecipe(recipe.id);
      onDeleted();
    });

    const link = el("a", { href: `#/recipe/${recipe.id}`, class: "card-title" }, [recipe.title]);

    const card = el("div", { class: "recipe-card" }, [
      thumb,
      el("div", { class: "recipe-card-body" }, [
        link,
        el("div", { class: "card-meta" }, [
          el("span", { class: "badge" }, [sourceTypeBadgeLabel(recipe.sourceType)]),
          recipe.author ? ` · ${recipe.author}` : "",
          ` · ${formatDate(recipe.savedAt)}`,
        ]),
        deleteBtn,
      ]),
    ]);
    listEl.append(card);
  }
}

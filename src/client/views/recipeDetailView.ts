import { getRecipe, deleteRecipe } from "../api.js";
import { clear, el, formatDate, sourceTypeBadgeLabel } from "../dom.js";

export function renderRecipeDetailView(container: HTMLElement, id: number): void {
  clear(container);
  const status = el("div", { class: "status" }, ["Loading…"]);
  container.append(status);

  getRecipe(id)
    .then(({ recipe }) => {
      clear(container);

      const deleteBtn = el("button", { class: "btn btn-danger" }, ["Delete"]);
      deleteBtn.addEventListener("click", async () => {
        if (!confirm(`Delete "${recipe.title}"?`)) return;
        await deleteRecipe(recipe.id);
        location.hash = "#/saved";
      });

      const image = recipe.image ? el("img", { src: recipe.image, class: "detail-image", alt: "" }) : null;

      const times = [
        recipe.prepTimeMinutes != null ? `Prep: ${recipe.prepTimeMinutes} min` : null,
        recipe.cookTimeMinutes != null ? `Cook: ${recipe.cookTimeMinutes} min` : null,
        recipe.totalTimeMinutes != null ? `Total: ${recipe.totalTimeMinutes} min` : null,
        recipe.servings ? `Servings: ${recipe.servings}` : null,
      ].filter((x): x is string => Boolean(x));

      const ingredientsList = el(
        "ul",
        { class: "ingredient-list" },
        recipe.ingredients.map((i) => el("li", {}, [i])),
      );
      const instructionsList = el(
        "ol",
        { class: "instruction-list" },
        recipe.instructions.map((i) => el("li", {}, [i])),
      );

      const section = el("section", { class: "card" }, [
        el("div", { class: "badges" }, [
          el("span", { class: "badge" }, [sourceTypeBadgeLabel(recipe.sourceType)]),
        ]),
        ...(image ? [image] : []),
        el("h1", {}, [recipe.title]),
        recipe.author ? el("p", { class: "muted" }, [`By ${recipe.author}`]) : el("span", {}, []),
        recipe.description ? el("p", {}, [recipe.description]) : el("span", {}, []),
        times.length > 0 ? el("p", { class: "meta-line" }, [times.join(" · ")]) : el("span", {}, []),
        el("h2", {}, ["Ingredients"]),
        ingredientsList,
        el("h2", {}, ["Instructions"]),
        instructionsList,
        el("p", {}, [
          el("a", { href: recipe.sourceUrl, target: "_blank", rel: "noopener noreferrer" }, ["View original source"]),
        ]),
        el("p", { class: "muted" }, [`Saved ${formatDate(recipe.savedAt)}`]),
        deleteBtn,
      ]);

      container.append(section);
    })
    .catch((err) => {
      clear(container);
      container.append(el("div", { class: "banner banner-error" }, [err instanceof Error ? err.message : "Failed to load recipe."]));
    });
}

import { renderExtractView } from "./views/extractView.js";
import { renderSavedListView } from "./views/savedListView.js";
import { renderRecipeDetailView } from "./views/recipeDetailView.js";

function route(): void {
  const app = document.getElementById("app");
  if (!app) return;

  const hash = location.hash || "#/";

  if (hash.startsWith("#/recipe/")) {
    const id = Number(hash.slice("#/recipe/".length));
    if (Number.isFinite(id)) {
      renderRecipeDetailView(app, id);
      return;
    }
  }

  if (hash === "#/saved") {
    renderSavedListView(app);
    return;
  }

  renderExtractView(app);
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

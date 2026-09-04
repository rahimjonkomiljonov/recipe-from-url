export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

export function clear(container: HTMLElement): void {
  container.innerHTML = "";
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function sourceTypeBadgeLabel(sourceType: string): string {
  switch (sourceType) {
    case "youtube":
      return "YouTube";
    case "instagram":
      return "Instagram";
    case "manual":
      return "Pasted text";
    default:
      return "Website";
  }
}

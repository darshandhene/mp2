import type { MealSummary, SortDirection, SortKey, ViewState } from "../types/meal.ts";

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

export function selectList(
  items: readonly MealSummary[],
  query: string,
  sortBy: SortKey,
  direction: SortDirection,
): MealSummary[] {
  const needle = query.trim().toLowerCase();
  const matched = needle
    ? items.filter((item) => item.name.toLowerCase().includes(needle))
    : items.slice();
  const factor = direction === "desc" ? -1 : 1;
  return matched.sort((left, right) => {
    const primary =
      sortBy === "category"
        ? compareText(left.category, right.category)
        : compareText(left.name, right.name);
    if (primary !== 0) return primary * factor;
    if (sortBy === "category") {
      const byName = compareText(left.name, right.name);
      if (byName !== 0) return byName;
    }
    return compareText(left.id, right.id);
  });
}

export function selectGallery(items: readonly MealSummary[], categories: readonly string[]): MealSummary[] {
  const selected = new Set(categories.map((category) => category.trim()).filter(Boolean));
  const matched =
    selected.size === 0 ? items.slice() : items.filter((item) => selected.has(item.category));
  const seen = new Set<string>();
  const unique = matched.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return unique.sort((left, right) => compareText(left.name, right.name) || compareText(left.id, right.id));
}

export function getNeighbors(
  ids: readonly string[],
  currentId: string,
): { previous: string | null; next: string | null } {
  if (ids.length < 2) return { previous: null, next: null };
  const index = ids.indexOf(currentId);
  if (index < 0) return { previous: null, next: null };
  const previous = ids[(index - 1 + ids.length) % ids.length] ?? null;
  const next = ids[(index + 1) % ids.length] ?? null;
  return { previous, next };
}

const NAME_ORDER: ViewState = {
  from: "list",
  query: "",
  sortBy: "name",
  direction: "asc",
  categories: [],
};

export function detailCollection(
  items: readonly MealSummary[],
  mealId: string,
  state: ViewState,
): { ids: string[]; state: ViewState; inCatalog: boolean } {
  const inCatalog = items.some((item) => item.id === mealId);
  const selected =
    state.from === "gallery"
      ? selectGallery(items, state.categories)
      : selectList(items, state.query, state.sortBy, state.direction);
  if (selected.some((item) => item.id === mealId)) {
    return { ids: selected.map((item) => item.id), state, inCatalog };
  }
  if (inCatalog) {
    return {
      ids: selectList(items, "", "name", "asc").map((item) => item.id),
      state: NAME_ORDER,
      inCatalog,
    };
  }
  return { ids: [], state, inCatalog };
}

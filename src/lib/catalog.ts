import type { MealSummary, Page, SortDirection, SortKey, ViewState } from "../types/meal.ts";

export const PAGE_SIZE = 24;

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function comparatorFor(sortBy: SortKey, direction: SortDirection) {
  const factor = direction === "desc" ? -1 : 1;
  return (left: MealSummary, right: MealSummary): number => {
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
  };
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
  return matched.sort(comparatorFor(sortBy, direction));
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

export function selectCollection(items: readonly MealSummary[], view: ViewState): MealSummary[] {
  const needle = view.query.trim().toLowerCase();
  const selected = new Set(view.categories.map((category) => category.trim()).filter(Boolean));
  const seen = new Set<string>();
  const matched = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    if (needle && !item.name.toLowerCase().includes(needle)) return false;
    return selected.size === 0 || selected.has(item.category);
  });
  return matched.sort(comparatorFor(view.sortBy, view.direction));
}

export function paginate<T>(items: readonly T[], requestedPage: number, pageSize = PAGE_SIZE): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.isInteger(requestedPage) ? requestedPage : 1;
  const page = Math.min(Math.max(requested, 1), pageCount);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageCount, total };
}

export function pageForIndex(index: number, pageSize = PAGE_SIZE): number {
  if (!Number.isInteger(index) || index < 0) return 1;
  return Math.floor(index / pageSize) + 1;
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
  page: 1,
};

export function detailCollection(
  items: readonly MealSummary[],
  mealId: string,
  state: ViewState,
): { ids: string[]; state: ViewState; inCatalog: boolean } {
  const inCatalog = items.some((item) => item.id === mealId);
  const selected = selectCollection(items, state);
  if (selected.some((item) => item.id === mealId)) {
    return { ids: selected.map((item) => item.id), state, inCatalog };
  }
  if (inCatalog) {
    const fallback: ViewState = { ...NAME_ORDER, from: state.from };
    return {
      ids: selectCollection(items, fallback).map((item) => item.id),
      state: fallback,
      inCatalog,
    };
  }
  return { ids: [], state, inCatalog };
}

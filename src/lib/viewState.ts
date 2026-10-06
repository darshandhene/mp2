import type { SortDirection, SortKey, ViewState } from "../types/meal.ts";

export function sortKeyFrom(value: string): SortKey {
  return value === "category" ? "category" : "name";
}

export function directionFrom(value: string): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

export function parseViewState(params: URLSearchParams): ViewState {
  const from = params.get("from");
  const sortBy = params.get("sort");
  const direction = params.get("direction");
  const categories = [
    ...new Set(params.getAll("category").map((category) => category.trim()).filter(Boolean)),
  ];
  return {
    from: from === "gallery" ? "gallery" : "list",
    query: params.get("q") ?? "",
    sortBy: sortBy === "category" ? "category" : "name",
    direction: direction === "desc" ? "desc" : "asc",
    categories,
  };
}

export function serializeViewState(state: ViewState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.from !== "list") params.set("from", state.from);
  if (state.query) params.set("q", state.query);
  if (state.sortBy !== "name") params.set("sort", state.sortBy);
  if (state.direction !== "asc") params.set("direction", state.direction);
  for (const category of state.categories) params.append("category", category);
  return params;
}

export function hrefFor(pathname: string, state: ViewState): string {
  const search = serializeViewState(state).toString();
  return search ? `${pathname}?${search}` : pathname;
}

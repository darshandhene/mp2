import { describe, expect, it } from "vitest";
import { fixtureMeals } from "../test/fixtures.ts";
import type { MealSummary, ViewState } from "../types/meal.ts";
import {
  PAGE_SIZE,
  detailCollection,
  getNeighbors,
  pageForIndex,
  paginate,
  selectCollection,
  selectGallery,
  selectList,
} from "./catalog.ts";

const DEFAULTS: ViewState = {
  from: "list",
  query: "",
  sortBy: "name",
  direction: "asc",
  categories: [],
  page: 1,
};

function view(overrides: Partial<ViewState>): ViewState {
  return { ...DEFAULTS, ...overrides };
}

function ids(items: readonly MealSummary[]): string[] {
  return items.map((item) => item.id);
}

function meal(id: string, name: string, category: string): MealSummary {
  return { id, name, category, imageUrl: null };
}

function deepFreeze<T extends object>(items: T[]): readonly T[] {
  for (const item of items) Object.freeze(item);
  return Object.freeze(items);
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

describe("selectCollection", () => {
  it("combines name query AND multi-category OR", () => {
    const result = selectCollection(fixtureMeals, view({ query: "pancake", categories: ["Dessert", "Vegetarian"] }));
    expect(ids(result)).toEqual(["2005", "2009", "3002"]);
  });

  it("returns every meal for a blank or whitespace query and no categories", () => {
    expect(selectCollection(fixtureMeals, view({ query: "" }))).toHaveLength(26);
    expect(selectCollection(fixtureMeals, view({ query: "   " }))).toHaveLength(26);
  });

  it("trims the query and matches case-insensitively", () => {
    expect(ids(selectCollection(fixtureMeals, view({ query: "  FISH PIE  " })))).toEqual(["4001"]);
  });

  it("matches Unicode names case-insensitively", () => {
    expect(ids(selectCollection(fixtureMeals, view({ query: "æBLE" })))).toEqual(["2000"]);
    expect(ids(selectCollection(fixtureMeals, view({ query: "të mbushura" })))).toEqual(["3005"]);
  });

  it("filters by trimmed categories with OR semantics", () => {
    const result = selectCollection(fixtureMeals, view({ categories: [" Seafood ", "Breakfast", ""] }));
    expect(result).toHaveLength(10);
    expect(new Set(result.map((item) => item.category))).toEqual(new Set(["Seafood", "Breakfast"]));
  });

  it("returns nothing for an unknown category instead of broadening", () => {
    expect(selectCollection(fixtureMeals, view({ categories: ["Lunch"] }))).toEqual([]);
    expect(ids(selectCollection(fixtureMeals, view({ categories: ["Lunch", "Seafood"] })))).toEqual(["4001", "4000"]);
  });

  it("sorts by name ascending with duplicate names ordered by id", () => {
    const result = selectCollection(fixtureMeals, view({ query: "pancakes", categories: ["Dessert", "Vegetarian"] }));
    expect(ids(result)).toEqual(["2005", "2009", "3002"]);
  });

  it("sorts by name descending while id ties stay ascending", () => {
    const result = selectCollection(
      fixtureMeals,
      view({ query: "pancakes", categories: ["Dessert", "Vegetarian"], direction: "desc" }),
    );
    expect(ids(result)).toEqual(["2009", "3002", "2005"]);
  });

  it("sorts by category ascending, breaking ties by name then id", () => {
    const result = selectCollection(
      fixtureMeals,
      view({ query: "pancake", categories: ["Dessert", "Vegetarian"], sortBy: "category" }),
    );
    expect(ids(result)).toEqual(["2005", "2009", "3002"]);
  });

  it("moves later categories ahead when sorting by category ascending", () => {
    const result = selectCollection(fixtureMeals, view({ categories: ["Vegetarian", "Seafood"], sortBy: "category" }));
    expect(ids(result)).toEqual(["4001", "4000", "3000", "3005", "3001", "3003", "3002", "3004"]);
  });

  it("sorts by category descending, keeping name ascending within a category", () => {
    const result = selectCollection(
      fixtureMeals,
      view({ query: "pancake", categories: ["Dessert", "Vegetarian"], sortBy: "category", direction: "desc" }),
    );
    expect(ids(result)).toEqual(["3002", "2005", "2009"]);
  });

  it("uses id order for identical names and categories", () => {
    const items = [meal("b", "Soup", "Starter"), meal("a", "Soup", "Starter"), meal("c", "Bread", "Starter")];
    expect(ids(selectCollection(items, view({})))).toEqual(["c", "a", "b"]);
    expect(ids(selectCollection(items, view({ direction: "desc" })))).toEqual(["a", "b", "c"]);
    expect(ids(selectCollection(items, view({ sortBy: "category", direction: "desc" })))).toEqual(["c", "a", "b"]);
  });

  it("matches selectList ordering for every sort combination", () => {
    for (const sortBy of ["name", "category"] as const) {
      for (const direction of ["asc", "desc"] as const) {
        expect(ids(selectCollection(fixtureMeals, view({ sortBy, direction, query: "a" })))).toEqual(
          ids(selectList(fixtureMeals, "a", sortBy, direction)),
        );
      }
    }
  });

  it("deduplicates by id with the first occurrence winning", () => {
    const items = [meal("1", "Pie", "Dessert"), meal("2", "Cake", "Dessert"), meal("1", "Pie", "Seafood")];
    const result = selectCollection(items, view({}));
    expect(ids(result)).toEqual(["2", "1"]);
    expect(result[1]?.category).toBe("Dessert");
  });

  it("does not mutate the input array or its items", () => {
    const items = deepFreeze(fixtureMeals.map((item) => ({ ...item })));
    const snapshot = JSON.stringify(items);
    expect(() =>
      selectCollection(items, view({ query: "a", categories: ["Dessert"], sortBy: "category", direction: "desc" })),
    ).not.toThrow();
    expect(() => selectCollection(items, view({}))).not.toThrow();
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  it("ignores from and page when selecting", () => {
    expect(selectCollection(fixtureMeals, view({ from: "gallery", page: 5 }))).toEqual(
      selectCollection(fixtureMeals, view({})),
    );
  });
});

describe("paginate", () => {
  it("exports a page size of 24", () => {
    expect(PAGE_SIZE).toBe(24);
  });

  it.each([
    [23, 1, 23],
    [24, 1, 24],
    [25, 2, 1],
    [48, 2, 24],
    [49, 3, 1],
  ])("splits %i items into %i pages with %i on the last page", (count, pageCount, lastSize) => {
    const items = range(count);
    const first = paginate(items, 1);
    expect(first).toMatchObject({ page: 1, pageCount, total: count });
    expect(first.items).toEqual(items.slice(0, Math.min(PAGE_SIZE, count)));
    const last = paginate(items, pageCount);
    expect(last.page).toBe(pageCount);
    expect(last.items).toHaveLength(lastSize);
    expect(last.items[last.items.length - 1]).toBe(count - 1);
  });

  it("returns the second page slice", () => {
    expect(paginate(range(49), 2).items).toEqual(range(49).slice(24, 48));
  });

  it("clamps an oversized page to the last page", () => {
    const result = paginate(range(30), 99);
    expect(result).toMatchObject({ page: 2, pageCount: 2, total: 30 });
    expect(result.items).toEqual(range(30).slice(24));
  });

  it("clamps after narrowing results", () => {
    const narrowed = selectCollection(fixtureMeals, view({}));
    const result = paginate(narrowed, 3);
    expect(result).toMatchObject({ page: 2, pageCount: 2, total: 26 });
    expect(result.items).toEqual(narrowed.slice(24));
  });

  it.each([0, -1, -24, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2.5, 1.0000001])(
    "treats page %s as 1",
    (requested) => {
      const result = paginate(range(60), requested);
      expect(result.page).toBe(1);
      expect(result.items).toEqual(range(24));
    },
  );

  it("handles an empty collection", () => {
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
    expect(paginate([], 7)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });

  it("honors a custom page size", () => {
    expect(paginate(range(10), 2, 4)).toEqual({ items: [4, 5, 6, 7], page: 2, pageCount: 3, total: 10 });
  });

  it("does not mutate the input", () => {
    const items = Object.freeze(range(30));
    const result = paginate(items, 2);
    expect(items).toEqual(range(30));
    expect(result.items).not.toBe(items);
  });
});

describe("pageForIndex", () => {
  it.each([
    [0, 1],
    [23, 1],
    [24, 2],
    [47, 2],
    [48, 3],
  ])("maps index %i to page %i", (index, page) => {
    expect(pageForIndex(index)).toBe(page);
  });

  it.each([-1, -30, 2.5, Number.NaN, Number.POSITIVE_INFINITY])("maps invalid index %s to page 1", (index) => {
    expect(pageForIndex(index)).toBe(1);
  });

  it("honors a custom page size", () => {
    expect(pageForIndex(9, 4)).toBe(3);
  });
});

describe("detailCollection", () => {
  it("uses the filtered and sorted collection for a list view", () => {
    const state = view({ query: "pancake", categories: ["Dessert", "Vegetarian"], direction: "desc", page: 2 });
    const result = detailCollection(fixtureMeals, "2009", state);
    expect(result).toEqual({ ids: ["2009", "3002", "2005"], state, inCatalog: true });
  });

  it("applies query and sort for a gallery view too", () => {
    const state = view({ from: "gallery", query: "pancake", categories: ["Dessert", "Vegetarian"], sortBy: "category", direction: "desc" });
    const result = detailCollection(fixtureMeals, "3002", state);
    expect(result).toEqual({ ids: ["3002", "2005", "2009"], state, inCatalog: true });
  });

  it("covers the full collection, not just one page", () => {
    const state = view({ page: 1 });
    const result = detailCollection(fixtureMeals, "4000", state);
    expect(result.ids).toHaveLength(26);
    expect(result.ids).toEqual(ids(selectCollection(fixtureMeals, state)));
  });

  it("falls back to the full name-ordered catalog when the meal is excluded, preserving from", () => {
    const state = view({ from: "gallery", query: "pie", categories: ["Seafood"], sortBy: "category", direction: "desc", page: 3 });
    const result = detailCollection(fixtureMeals, "1000", state);
    expect(result.inCatalog).toBe(true);
    expect(result.ids).toEqual(ids(selectList(fixtureMeals, "", "name", "asc")));
    expect(result.state).toEqual({ ...DEFAULTS, from: "gallery" });
  });

  it("falls back with from list for an excluded list view", () => {
    const result = detailCollection(fixtureMeals, "1000", view({ categories: ["Seafood"] }));
    expect(result.state).toEqual(DEFAULTS);
  });

  it("returns no ids when the meal is absent from the catalog", () => {
    const state = view({ from: "gallery", query: "pie", page: 2 });
    expect(detailCollection(fixtureMeals, "missing", state)).toEqual({ ids: [], state, inCatalog: false });
  });
});

describe("getNeighbors", () => {
  it("wraps around both ends", () => {
    expect(getNeighbors(["a", "b", "c"], "a")).toEqual({ previous: "c", next: "b" });
    expect(getNeighbors(["a", "b", "c"], "c")).toEqual({ previous: "b", next: "a" });
    expect(getNeighbors(["a", "b", "c"], "b")).toEqual({ previous: "a", next: "c" });
  });

  it("returns no neighbors for single, empty, or missing ids", () => {
    expect(getNeighbors(["a"], "a")).toEqual({ previous: null, next: null });
    expect(getNeighbors([], "a")).toEqual({ previous: null, next: null });
    expect(getNeighbors(["a", "b"], "z")).toEqual({ previous: null, next: null });
  });
});

describe("legacy selectors", () => {
  it("selectGallery still filters by category and orders by name then id", () => {
    expect(ids(selectGallery(fixtureMeals, ["Seafood"]))).toEqual(["4001", "4000"]);
  });
});

import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureMeals } from "../test/fixtures.ts";
import type { MealsContextValue } from "../types/meal.ts";
import { useCollection } from "./useCollection.ts";

const meals: MealsContextValue = {
  items: fixtureMeals,
  status: "ready",
  failedCategories: [],
  error: null,
  retry: vi.fn(async () => {}),
};

vi.mock("../context/MealsProvider.tsx", () => ({ useMeals: () => meals }));

function setup(initialUrl: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  );
  return renderHook(
    () => {
      const collection = useCollection("list");
      const location = useLocation();
      return { collection, location };
    },
    { wrapper },
  );
}

describe("useCollection", () => {
  beforeEach(() => {
    meals.items = fixtureMeals;
    meals.status = "ready";
    meals.failedCategories = [];
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });

  it("pages the full catalog 24 at a time", () => {
    const { result } = setup("/list");
    expect(result.current.collection.results.items).toHaveLength(24);
    expect(result.current.collection.results.pageCount).toBe(2);
    expect(result.current.collection.results.total).toBe(26);
  });

  it("combines search with categories from the URL", () => {
    const { result } = setup("/list?q=pancake&category=Dessert&category=Vegetarian");
    const names = result.current.collection.results.items.map((meal) => `${meal.name}|${meal.category}`);
    expect(names).toEqual(["Banana Pancakes|Dessert", "Pancakes|Dessert", "Pancakes|Vegetarian"]);
  });

  it("clamps an out-of-range page and rewrites the URL", () => {
    const { result } = setup("/list?page=9");
    expect(result.current.collection.results.page).toBe(2);
    expect(result.current.location.search).toBe("?page=2");
  });

  it("does not rewrite the page while the catalog is still loading", () => {
    meals.items = [];
    meals.status = "loading";
    const { result } = setup("/list?page=3");
    expect(result.current.collection.waiting).toBe(true);
    expect(result.current.location.search).toBe("?page=3");
  });

  it("reports an unavailable catalog only when loading failed with nothing to show", () => {
    meals.items = [];
    meals.status = "error";
    const { result } = setup("/list");
    expect(result.current.collection.unavailable).toBe(true);
    expect(result.current.collection.waiting).toBe(false);
  });

  it("lists loaded and failed categories alphabetically", () => {
    meals.failedCategories = ["Goat"];
    const { result } = setup("/list");
    expect(result.current.collection.categories).toEqual(["Breakfast", "Dessert", "Goat", "Seafood", "Vegetarian"]);
  });

  it("builds detail links that carry the full collection context and page", () => {
    const { result } = setup("/list?category=Breakfast&sort=category&direction=desc&page=1");
    const href = result.current.collection.detailHref("1001");
    expect(href).toBe("/meal/1001?sort=category&direction=desc&category=Breakfast");
  });

  it("keeps the gallery origin in detail links", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={["/gallery?page=2"]}>{children}</MemoryRouter>
    );
    const { result } = renderHook(() => useCollection("gallery"), { wrapper });
    expect(result.current.detailHref("2000")).toBe("/meal/2000?from=gallery&page=2");
  });

  it("goes to another page with a new history entry", () => {
    const { result } = setup("/list");
    act(() => result.current.collection.goToPage(2));
    expect(result.current.location.search).toBe("?page=2");
    expect(result.current.collection.results.items).toHaveLength(2);
  });

  it("resets to page 1 when the toolbar changes the view", () => {
    const { result } = setup("/list?page=2");
    act(() =>
      result.current.collection.setView({ ...result.current.collection.view, categories: ["Breakfast"], page: 1 }),
    );
    expect(result.current.location.search).toBe("?category=Breakfast");
    expect(result.current.collection.results.items.every((meal) => meal.category === "Breakfast")).toBe(true);
  });

  it("prefers the featured intro photo when it is in the catalog", () => {
    meals.items = [
      ...fixtureMeals,
      { id: "53379", name: "Dutch poffertjes", category: "Breakfast", imageUrl: "https://example.test/poffertjes.jpg" },
    ];
    const { result } = setup("/list");
    expect(result.current.collection.featuredImageUrl).toBe("https://example.test/poffertjes.jpg");
  });
});

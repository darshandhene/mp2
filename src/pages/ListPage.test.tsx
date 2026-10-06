import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readBrowsePosition } from "../lib/browsePosition.ts";
import { fixtureMeals } from "../test/fixtures.ts";
import type { MealsContextValue } from "../types/meal.ts";
import { ListPage } from "./ListPage.tsx";

const meals: MealsContextValue = {
  items: fixtureMeals,
  status: "ready",
  failedCategories: [],
  error: null,
  retry: vi.fn(async () => {}),
};

vi.mock("../context/MealsProvider.tsx", () => ({ useMeals: () => meals }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
}

function renderList(url = "/list") {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/list" element={<ListPage />} />
        <Route path="/meal/:id" element={<p>Detail page</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  return { user, ...view };
}

const location = () => screen.getByTestId("location").textContent;
const results = () => screen.getByRole("list", { name: "Recipes" });
const resultLinks = () => within(results()).getAllByRole("link");
const names = () => resultLinks().map((link) => link.querySelector("[data-name]")?.textContent);
const categoriesShown = () => resultLinks().map((link) => link.querySelector("[data-category]")?.textContent);

describe("ListPage", () => {
  beforeEach(() => {
    meals.items = fixtureMeals;
    meals.status = "ready";
    meals.failedCategories = [];
    window.sessionStorage.clear();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the catalog as links, at most 24 on the first page", () => {
    renderList();
    expect(resultLinks()).toHaveLength(24);
    expect(screen.getByRole("link", { name: /Breakfast Potatoes/ })).toHaveAttribute("href", "/meal/1001");
    expect(screen.getByText("26 recipes")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("loads the first eight photos eagerly and the rest lazily", () => {
    const { container } = renderList();
    const images = container.querySelectorAll("ul img");
    expect(images[7]).toHaveAttribute("loading", "eager");
    expect(images[8]).toHaveAttribute("loading", "lazy");
  });

  it("filters live while typing, without submitting", async () => {
    const { user } = renderList();
    await user.type(screen.getByRole("searchbox", { name: "Search recipes by name" }), "pancake");
    expect(names()).toEqual([
      "Banana Pancakes",
      "Dutch poffertjes (mini pancakes)",
      "Oatmeal pancakes",
      "Pancakes",
      "Pancakes",
    ]);
    expect(screen.getByText("5 matching recipes")).toBeInTheDocument();
    expect(location()).toBe("/list?q=pancake");
  });

  it("combines the name search with categories, OR within categories", async () => {
    const { user } = renderList();
    await user.click(screen.getByRole("button", { name: "Dessert" }));
    await user.click(screen.getByRole("button", { name: "Vegetarian" }));
    expect(resultLinks()).toHaveLength(16);
    expect(new Set(categoriesShown())).toEqual(new Set(["Dessert", "Vegetarian"]));

    await user.type(screen.getByRole("searchbox", { name: "Search recipes by name" }), "pancake");
    expect(resultLinks().map((link) => link.textContent)).toEqual([
      "Banana PancakesDessert",
      "PancakesDessert",
      "PancakesVegetarian",
    ]);
    expect(screen.getByText("3 matching recipes")).toBeInTheDocument();
  });

  it("sorts by name in both directions", async () => {
    const { user } = renderList("/list?q=pa");
    const ascending = names();
    expect(ascending[0]).toBe("Air fryer patatas bravas");

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "desc");
    expect(names()).toEqual([...ascending].reverse());
    expect(location()).toBe("/list?q=pa&direction=desc");
  });

  it("sorts by category in both directions", async () => {
    const { user } = renderList();
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort by" }), "category");
    expect(categoriesShown()[0]).toBe("Breakfast");

    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "desc");
    expect(categoriesShown()[0]).toBe("Vegetarian");
    expect(location()).toBe("/list?sort=category&direction=desc");
  });

  it("pages forward to the remaining two and back, scrolling the results into view", async () => {
    const { user } = renderList();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(resultLinks()).toHaveLength(2);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(location()).toBe("/list?page=2");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(resultLinks()).toHaveLength(24);
    expect(location()).toBe("/list");
  });

  it("returns to page 1 when a filter changes", async () => {
    const { user } = renderList("/list?page=2");
    expect(resultLinks()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    expect(location()).toBe("/list?category=Breakfast");
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(resultLinks()).toHaveLength(8);
  });

  it("clamps an out-of-range page to the last page", () => {
    renderList("/list?page=9");
    expect(resultLinks()).toHaveLength(2);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(location()).toBe("/list?page=2");
  });

  it("switches to the gallery keeping search, categories, sort, and page", () => {
    renderList("/list?q=pan&category=Dessert&sort=category");
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute(
      "href",
      "/gallery?from=gallery&q=pan&sort=category&category=Dessert",
    );
  });

  it("keeps the page in the gallery switch link", () => {
    renderList("/list?sort=category&direction=desc&page=2");
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute(
      "href",
      "/gallery?from=gallery&sort=category&direction=desc&page=2",
    );
  });

  it("links each result to its detail page with the current context", () => {
    renderList("/list?category=Breakfast&sort=category&direction=desc");
    expect(screen.getByRole("link", { name: /Breakfast Potatoes/ })).toHaveAttribute(
      "href",
      "/meal/1001?sort=category&direction=desc&category=Breakfast",
    );
  });

  it("carries the page into detail links on later pages", () => {
    renderList("/list?page=2");
    for (const link of resultLinks()) {
      expect(link.getAttribute("href")).toMatch(/^\/meal\/\d+\?page=2$/);
    }
  });

  it("remembers the scroll position when a result is opened", async () => {
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
    const { user } = renderList();
    await user.click(screen.getByRole("link", { name: /Breakfast Potatoes/ }));
    expect(screen.getByText("Detail page")).toBeInTheDocument();
    expect(readBrowsePosition("/list")).toBe(420);
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("shows loading text and skeletons while waiting, never 0 recipes", () => {
    meals.items = [];
    meals.status = "loading";
    const { container } = renderList();
    expect(screen.getByText("Loading recipes…")).toBeInTheDocument();
    expect(screen.queryByText(/0 recipes/)).not.toBeInTheDocument();
    const skeleton = container.querySelector('ul[aria-hidden="true"]');
    expect(skeleton?.children).toHaveLength(8);
    expect(screen.queryByRole("list", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });

  it("shows no results, skeletons, or pagination when the catalog is unavailable", () => {
    meals.items = [];
    meals.status = "error";
    const { container } = renderList();
    expect(screen.queryByRole("list", { name: "Recipes" })).not.toBeInTheDocument();
    expect(container.querySelector('ul[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    expect(screen.queryByText("No recipes match your search")).not.toBeInTheDocument();
    expect(screen.getByText("No recipes loaded")).toBeInTheDocument();
  });

  it("explains empty results and clears the filters", async () => {
    const { user } = renderList("/list?category=Dessert&page=1");
    await user.type(screen.getByRole("searchbox", { name: "Search recipes by name" }), "zzz");
    const empty = screen.getByRole("region", { name: "No recipes match your search" });
    expect(screen.getByRole("heading", { name: "No recipes match your search" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();

    await user.click(within(empty).getByRole("button", { name: "Show all recipes" }));
    expect(resultLinks()).toHaveLength(24);
    expect(location()).toBe("/list");
  });

  it("renders the photo fallback for a recipe without an image", () => {
    renderList("/list?q=salt");
    const link = screen.getByRole("link", { name: /Salt cod tortilla/ });
    expect(within(link).getByText("No photo")).toBeInTheDocument();
    expect(link.querySelector("img")).toBeNull();
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureMeals } from "../test/fixtures.ts";
import type { MealsContextValue } from "../types/meal.ts";
import { GalleryPage } from "./GalleryPage.tsx";

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

function renderGallery(url = "/gallery") {
  const user = userEvent.setup();
  const view = render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/meal/:id" element={<p>Detail page</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
  return { user, ...view };
}

const grid = () => screen.getByRole("list", { name: "Recipes" });
const tiles = () => within(grid()).getAllByRole("link");
const location = () => screen.getByTestId("location").textContent ?? "";

describe("GalleryPage", () => {
  beforeEach(() => {
    meals.items = fixtureMeals;
    meals.status = "ready";
    meals.failedCategories = [];
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Element.prototype.scrollIntoView = vi.fn();
    window.sessionStorage.clear();
  });

  it("renders at most 24 tiles with photos from the API", () => {
    renderGallery();
    const links = tiles();
    expect(links).toHaveLength(24);
    const fixtureUrls = new Set(fixtureMeals.map((meal) => meal.imageUrl));
    const images = grid().querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(fixtureUrls.has(image.getAttribute("src"))).toBe(true);
  });

  it("loads the first 8 photos eagerly and the rest lazily", () => {
    renderGallery("/gallery?category=Breakfast&category=Dessert");
    const images = grid().querySelectorAll("img");
    expect(images).toHaveLength(18);
    expect(images[7]).toHaveAttribute("loading", "eager");
    expect(images[8]).toHaveAttribute("loading", "lazy");
  });

  it("filters to Breakfast when that category is selected", async () => {
    const { user } = renderGallery();
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    const links = tiles();
    expect(links).toHaveLength(8);
    for (const link of links) expect(link).toHaveTextContent(/Breakfast$/);
  });

  it("shows recipes in either selected category", async () => {
    const { user } = renderGallery();
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    await user.click(screen.getByRole("button", { name: "Dessert" }));
    const links = tiles();
    expect(links).toHaveLength(18);
    for (const link of links) expect(link).toHaveTextContent(/(Breakfast|Dessert)$/);
  });

  it("narrows by live search within the selected categories", async () => {
    const { user } = renderGallery("/gallery?category=Dessert");
    await user.type(screen.getByLabelText("Search recipes by name"), "panc");
    const links = tiles();
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Banana Pancakes");
    expect(links[1]).toHaveTextContent(/^PancakesDessert$/);
  });

  it("sorts by name in both directions", async () => {
    const { user } = renderGallery("/gallery?category=Breakfast");
    expect(tiles()[0]).toHaveTextContent("Bread omelette");
    await user.selectOptions(screen.getByLabelText("Order"), "desc");
    expect(tiles()[0]).toHaveTextContent("Salmon Eggs Eggs Benedict");
    expect(tiles().at(-1)).toHaveTextContent("Bread omelette");
  });

  it("sorts by category in both directions", async () => {
    const { user } = renderGallery();
    await user.selectOptions(screen.getByLabelText("Sort by"), "category");
    expect(tiles()[0]).toHaveTextContent(/Breakfast$/);
    await user.selectOptions(screen.getByLabelText("Order"), "desc");
    expect(tiles()[0]).toHaveTextContent(/Vegetarian$/);
  });

  it("clears every filter at once", async () => {
    const { user } = renderGallery("/gallery?q=panc&category=Dessert");
    expect(tiles()).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(tiles()).toHaveLength(24);
    expect(location()).toBe("/gallery?from=gallery");
  });

  it("removes a single category chip", async () => {
    const { user } = renderGallery("/gallery?category=Breakfast&category=Dessert");
    await user.click(screen.getByRole("button", { name: "Remove Dessert" }));
    const links = tiles();
    expect(links).toHaveLength(8);
    for (const link of links) expect(link).toHaveTextContent(/Breakfast$/);
  });

  it("pages through results and disables the boundary buttons", async () => {
    const { user } = renderGallery();
    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(previous).toBeDisabled();
    expect(next).toBeEnabled();

    await user.click(next);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(tiles()).toHaveLength(2);
    expect(location()).toBe("/gallery?from=gallery&page=2");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("returns to page 1 when a filter changes", async () => {
    const { user } = renderGallery("/gallery?page=2");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(location()).toBe("/gallery?from=gallery&category=Breakfast");
  });

  it("keeps search, categories, sort, and page on the List switch", () => {
    const first = renderGallery("/gallery?q=pan&category=Dessert&sort=category&direction=desc");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute(
      "href",
      "/list?q=pan&sort=category&direction=desc&category=Dessert",
    );
    first.unmount();

    renderGallery("/gallery?sort=category&page=2");
    expect(screen.getByRole("link", { name: "List" })).toHaveAttribute("href", "/list?sort=category&page=2");
  });

  it("links each tile to its detail page with the gallery context", () => {
    const first = renderGallery("/gallery?q=o&category=Breakfast&sort=category&direction=desc");
    const bread = tiles().find((link) => link.textContent?.startsWith("Bread omelette"));
    expect(bread).toHaveAttribute(
      "href",
      "/meal/1000?from=gallery&q=o&sort=category&direction=desc&category=Breakfast",
    );
    first.unmount();

    renderGallery("/gallery?sort=category&direction=desc&page=2");
    expect(tiles().at(-1)).toHaveAttribute("href", "/meal/1007?from=gallery&sort=category&direction=desc&page=2");
  });

  it("remembers the scroll position when a tile is opened", async () => {
    Object.defineProperty(window, "scrollY", { value: 640, configurable: true });
    const { user } = renderGallery("/gallery?category=Breakfast");
    await user.click(tiles()[0]);
    expect(window.sessionStorage.getItem("everyday-table:position:/gallery?from=gallery&category=Breakfast")).toBe(
      "640",
    );
    expect(screen.getByText("Detail page")).toBeInTheDocument();
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("shows skeleton tiles while loading and never 0 recipes", () => {
    meals.items = [];
    meals.status = "loading";
    const { container } = renderGallery();
    expect(screen.getByText("Loading recipes…")).toBeInTheDocument();
    expect(screen.queryByText(/\b0 recipes\b/)).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('ul[aria-hidden="true"] > li');
    expect(skeletons).toHaveLength(8);
    expect(screen.queryByRole("list", { name: "Recipes" })).not.toBeInTheDocument();
  });

  it("renders no grid, skeletons, or pagination when the catalog is unavailable", () => {
    meals.items = [];
    meals.status = "error";
    renderGallery();
    expect(screen.queryAllByRole("list", { hidden: true })).toHaveLength(0);
    expect(screen.queryByText(/\b0 recipes\b/)).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
  });

  it("shows an empty state whose Show all recipes restores results", async () => {
    const { user } = renderGallery("/gallery?q=zzz&category=Dessert");
    const heading = screen.getByRole("heading", { name: "No recipes match your search" });
    expect(screen.queryByRole("list", { name: "Recipes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pages" })).not.toBeInTheDocument();
    const empty = heading.parentElement as HTMLElement;
    await user.click(within(empty).getByRole("button", { name: "Show all recipes" }));
    expect(tiles()).toHaveLength(24);
    expect(location()).toBe("/gallery?from=gallery");
  });

  it("shows the photo fallback for a meal without an image", () => {
    renderGallery("/gallery?category=Seafood");
    const salt = tiles().find((link) => link.textContent?.includes("Salt cod tortilla")) as HTMLElement;
    expect(within(salt).getByText("No photo")).toBeInTheDocument();
    expect(salt.querySelector("img")).toBeNull();
  });
});

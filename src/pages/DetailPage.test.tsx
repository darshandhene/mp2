import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureDetail, fixtureMeals } from "../test/fixtures.ts";
import type { MealDetail, MealsContextValue, MealSummary } from "../types/meal.ts";

vi.mock("../context/MealsProvider.tsx", () => ({ useMeals: vi.fn() }));
vi.mock("../api/meals.ts", () => ({
  getMeal: vi.fn(),
  toErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Request failed"),
}));

const { useMeals } = await import("../context/MealsProvider.tsx");
const api = await import("../api/meals.ts");
const { DetailPage } = await import("./DetailPage.tsx");

function catalog(overrides: Partial<MealsContextValue> = {}): MealsContextValue {
  return {
    items: fixtureMeals,
    status: "ready",
    failedCategories: [],
    error: null,
    retry: vi.fn(async () => {}),
    ...overrides,
  };
}

function detailFor(id: string): MealDetail | null {
  if (id === fixtureDetail.id) return fixtureDetail;
  const summary: MealSummary | undefined = fixtureMeals.find((meal) => meal.id === id);
  if (!summary) return null;
  return {
    ...summary,
    area: null,
    instructions: `Make ${summary.name}.`,
    ingredients: [],
    sourceUrl: null,
    youtubeUrl: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/meal/:id" element={<DetailPage />} />
        <Route path="/list" element={<h1>List marker</h1>} />
        <Route path="/gallery" element={<h1>Gallery marker</h1>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

async function findTitle(name: string) {
  return screen.findByRole("heading", { level: 1, name });
}

function previousLink() {
  return screen.getByRole("link", { name: /^Previous/ });
}

function nextLink() {
  return screen.getByRole("link", { name: /^Next/ });
}

function backLink() {
  return screen.getByRole("link", { name: /^Back to/ });
}

beforeEach(() => {
  vi.mocked(useMeals).mockReturnValue(catalog());
  vi.mocked(api.getMeal).mockReset();
  vi.mocked(api.getMeal).mockImplementation(async (id: string) => detailFor(id));
  document.title = "Everyday Table";
});

describe("DetailPage details", () => {
  it("loads a recipe from a bare URL with its category, area, ingredients, and instructions", async () => {
    renderAt("/meal/1001");
    await findTitle("Breakfast Potatoes");
    expect(api.getMeal).toHaveBeenCalledWith("1001");
    expect(screen.getByText("Breakfast", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Canadian")).toBeInTheDocument();

    const ingredients = within(screen.getByRole("list", { name: "Ingredients" })).getAllByRole("listitem");
    expect(ingredients).toHaveLength(3);
    expect(ingredients[0]).toHaveTextContent("3 Medium");
    expect(ingredients[0]).toHaveTextContent("Potatoes");
    expect(ingredients[1]).toHaveTextContent("1 tbs");
    expect(ingredients[2]).toHaveTextContent("Garlic Clove");

    const method = screen.getByRole("region", { name: "Instructions" });
    const paragraphs = within(method).getAllByText(/./, { selector: "p" });
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual([
      "Wash the potatoes and cut into medium dice.",
      "Cook for 10 minutes until brown.",
    ]);

    const source = screen.getByRole("link", { name: "Recipe source" });
    expect(source).toHaveAttribute("href", "https://example.com/breakfast-potatoes");
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noreferrer");
    expect(screen.queryByRole("link", { name: "Video" })).not.toBeInTheDocument();
  });

  it("uses name order with no params", async () => {
    renderAt("/meal/1001");
    await findTitle("Breakfast Potatoes");
    expect(previousLink()).toHaveAttribute("href", "/meal/1000");
    expect(previousLink()).toHaveTextContent("Bread omelette");
    expect(nextLink()).toHaveAttribute("href", "/meal/2007");
    expect(nextLink()).toHaveTextContent("Chocolate Gateau");
    expect(backLink()).toHaveTextContent("Back to all recipes");
    expect(backLink()).toHaveAttribute("href", "/list");
    expect(screen.getByText("Recipe 12 of 26, sorted by name.")).toBeInTheDocument();
  });

  it("drops blank lines from instructions and renders them as text", async () => {
    vi.mocked(api.getMeal).mockResolvedValue({
      ...fixtureDetail,
      instructions: "Step one.\n\n   \n<b>Step two.</b>\n",
      sourceUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=abc",
    });
    renderAt("/meal/1001");
    await findTitle("Breakfast Potatoes");
    const method = screen.getByRole("region", { name: "Instructions" });
    const paragraphs = within(method).getAllByText(/./, { selector: "p" });
    expect(paragraphs.map((paragraph) => paragraph.textContent)).toEqual(["Step one.", "<b>Step two.</b>"]);
    expect(screen.queryByRole("link", { name: "Recipe source" })).not.toBeInTheDocument();
    const video = screen.getByRole("link", { name: "Video" });
    expect(video).toHaveAttribute("target", "_blank");
    expect(video).toHaveAttribute("rel", "noreferrer");
  });

  it("sets the document title and resets it on unmount", async () => {
    const view = renderAt("/meal/1001");
    await findTitle("Breakfast Potatoes");
    expect(document.title).toBe("Breakfast Potatoes — Everyday Table");
    view.unmount();
    expect(document.title).toBe("Everyday Table");
  });
});

describe("DetailPage navigation", () => {
  it("works with old URLs that have no page and replaces stale pages", async () => {
    const view = renderAt("/meal/4000?sort=name&direction=asc");
    await findTitle("Salt cod tortilla");
    expect(backLink()).toHaveAttribute("href", "/list?page=2");
    view.unmount();

    renderAt("/meal/1001?page=5");
    await findTitle("Breakfast Potatoes");
    expect(backLink()).toHaveAttribute("href", "/list");
    expect(nextLink()).toHaveAttribute("href", "/meal/2007");
  });

  it("sets page 1 and 2 across indices 23 and 24", async () => {
    const user = userEvent.setup();
    renderAt("/meal/1007");
    await findTitle("Salmon Eggs Eggs Benedict");
    expect(screen.getByText("Recipe 24 of 26, sorted by name.")).toBeInTheDocument();
    expect(nextLink()).toHaveAttribute("href", "/meal/4000?page=2");
    expect(nextLink()).toHaveTextContent("Salt cod tortilla");
    expect(previousLink()).toHaveAttribute("href", "/meal/3002");
    expect(backLink()).toHaveAttribute("href", "/list");

    await user.click(nextLink());
    await findTitle("Salt cod tortilla");
    expect(screen.getByTestId("location")).toHaveTextContent("/meal/4000?page=2");
    expect(previousLink()).toHaveAttribute("href", "/meal/1007");
    expect(nextLink()).toHaveAttribute("href", "/meal/3004?page=2");
    expect(backLink()).toHaveAttribute("href", "/list?page=2");
  });

  it("wraps from first to last and last to first", async () => {
    const view = renderAt("/meal/2000");
    await findTitle("Æbleskiver");
    expect(previousLink()).toHaveAttribute("href", "/meal/3004?page=2");
    expect(previousLink()).toHaveTextContent("Spicy North African Potato Salad");
    view.unmount();

    renderAt("/meal/3004");
    await findTitle("Spicy North African Potato Salad");
    expect(nextLink()).toHaveAttribute("href", "/meal/2000");
    expect(nextLink()).toHaveTextContent("Æbleskiver");
  });

  it("keeps the gallery context and categories in every link", async () => {
    const user = userEvent.setup();
    renderAt("/meal/1001?from=gallery&category=Breakfast&page=3");
    await findTitle("Breakfast Potatoes");
    expect(screen.getByText("Recipe 2 of 8 in Breakfast, sorted by name.")).toBeInTheDocument();
    expect(previousLink()).toHaveAttribute("href", "/meal/1000?from=gallery&category=Breakfast");
    expect(nextLink()).toHaveAttribute("href", "/meal/1002?from=gallery&category=Breakfast");
    expect(backLink()).toHaveTextContent("Back to Breakfast recipes");
    expect(backLink()).toHaveAttribute("href", "/gallery?from=gallery&category=Breakfast");

    await user.click(backLink());
    expect(await screen.findByRole("heading", { name: "Gallery marker" })).toBeInTheDocument();
  });

  it("joins several categories with 'and'", async () => {
    renderAt("/meal/4000?category=Breakfast&category=Seafood");
    await findTitle("Salt cod tortilla");
    expect(backLink()).toHaveTextContent("Back to Breakfast and Seafood recipes");
    expect(screen.getByText("Recipe 10 of 10 in Breakfast and Seafood, sorted by name.")).toBeInTheDocument();
  });

  it("describes category sort", async () => {
    renderAt("/meal/1001?sort=category");
    await findTitle("Breakfast Potatoes");
    expect(screen.getByText("Recipe 2 of 26, sorted by category.")).toBeInTheDocument();
    expect(nextLink()).toHaveAttribute("href", "/meal/1002?sort=category");
  });

  it("disables both directions in a single-item collection", async () => {
    renderAt("/meal/4000?q=salt%20cod");
    await findTitle("Salt cod tortilla");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("This is the only meal in the current list.")).toBeInTheDocument();
    expect(screen.getByText("Recipe 1 of 1, sorted by name.")).toBeInTheDocument();
    expect(backLink()).toHaveAttribute("href", "/list?q=salt+cod");
  });

  it("navigates within loaded meals when the catalog is partial", async () => {
    vi.mocked(useMeals).mockReturnValue(
      catalog({
        status: "partial",
        failedCategories: ["Seafood"],
        items: fixtureMeals.filter((meal) => meal.category !== "Seafood"),
      }),
    );
    renderAt("/meal/1007");
    await findTitle("Salmon Eggs Eggs Benedict");
    expect(nextLink()).toHaveAttribute("href", "/meal/3004");
    expect(nextLink()).toHaveTextContent("Spicy North African Potato Salad");
    expect(
      screen.getByText("Some categories did not load, so previous and next stay within the meals that arrived."),
    ).toBeInTheDocument();
  });

  it("disables navigation while the catalog is still loading", async () => {
    vi.mocked(useMeals).mockReturnValue(catalog({ status: "loading", items: [] }));
    renderAt("/meal/1001");
    await findTitle("Breakfast Potatoes");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("Previous and next are unavailable until the meal list loads.")).toBeInTheDocument();
    expect(screen.queryByText(/^Recipe \d+ of/)).not.toBeInTheDocument();
  });

  it("falls back to all recipes in name order when filters exclude the recipe", async () => {
    renderAt("/meal/1001?from=gallery&category=Dessert&q=cake&page=2");
    await findTitle("Breakfast Potatoes");
    expect(backLink()).toHaveTextContent("Back to all recipes");
    expect(backLink()).toHaveAttribute("href", "/gallery?from=gallery");
    expect(previousLink()).toHaveAttribute("href", "/meal/1000?from=gallery");
    expect(screen.getByText("Recipe 12 of 26, sorted by name.")).toBeInTheDocument();
  });

  it("shows a recipe outside the catalog with navigation disabled", async () => {
    vi.mocked(api.getMeal).mockResolvedValue({ ...fixtureDetail, id: "9999", name: "Hidden stew" });
    renderAt("/meal/9999");
    await findTitle("Hidden stew");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(
      screen.getByText("This recipe is outside the loaded meal list, so previous and next are unavailable."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Recipe \d+ of/)).not.toBeInTheDocument();
    expect(backLink()).toHaveAttribute("href", "/list");
  });
});

describe("DetailPage request states", () => {
  it("shows not found with a browse link", async () => {
    vi.mocked(api.getMeal).mockResolvedValue(null);
    renderAt("/meal/424242");
    await findTitle("Recipe not found");
    expect(screen.getByRole("link", { name: "Browse recipes" })).toHaveAttribute("href", "/list");
  });

  it("shows an error with Retry that refetches", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMeal).mockRejectedValueOnce(new Error("The meal service could not be reached."));
    renderAt("/meal/1001");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The meal service could not be reached.");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    await findTitle("Breakfast Potatoes");
    expect(api.getMeal).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores a stale response that resolves after the current one", async () => {
    const user = userEvent.setup();
    const pending = new Map<string, ReturnType<typeof deferred<MealDetail | null>>>();
    vi.mocked(api.getMeal).mockImplementation((id: string) => {
      const request = deferred<MealDetail | null>();
      pending.set(id, request);
      return request.promise;
    });

    renderAt("/meal/1007");
    expect(screen.getByText("Loading this recipe…")).toBeInTheDocument();
    await user.click(nextLink());
    expect(screen.getByTestId("location")).toHaveTextContent("/meal/4000?page=2");

    await act(async () => {
      pending.get("4000")?.resolve(detailFor("4000"));
    });
    await findTitle("Salt cod tortilla");

    await act(async () => {
      pending.get("1007")?.resolve(detailFor("1007"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Salt cod tortilla" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Salmon Eggs Eggs Benedict" })).not.toBeInTheDocument();
    expect(document.title).toBe("Salt cod tortilla — Everyday Table");
  });
});

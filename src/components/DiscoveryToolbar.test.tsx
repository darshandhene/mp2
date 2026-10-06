import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoveryToolbar } from "./DiscoveryToolbar.tsx";
import type { ViewState } from "../types/meal.ts";

const allCategories = [
  "Beef",
  "Breakfast",
  "Chicken",
  "Dessert",
  "Goat",
  "lamb",
  "Miscellaneous",
  "Pasta",
  "Pork",
  "Seafood",
  "Side",
  "Starter",
  "Vegan",
  "Vegetarian",
];

const baseView: ViewState = {
  from: "list",
  query: "",
  sortBy: "name",
  direction: "asc",
  categories: [],
  page: 3,
};

type HarnessProps = {
  initial?: Partial<ViewState>;
  availableCategories?: string[];
  total?: number;
  loading?: boolean;
  unavailable?: boolean;
  presentation?: React.ReactNode;
  spy?: (next: ViewState) => void;
};

function Harness({
  initial,
  availableCategories = allCategories,
  total = 42,
  loading = false,
  unavailable = false,
  presentation,
  spy,
}: HarnessProps) {
  const [view, setView] = useState<ViewState>({ ...baseView, ...initial });
  return (
    <DiscoveryToolbar
      view={view}
      availableCategories={availableCategories}
      total={total}
      loading={loading}
      unavailable={unavailable}
      presentation={presentation}
      onChange={(next) => {
        spy?.(next);
        setView(next);
      }}
    />
  );
}

function setup(props: HarnessProps = {}) {
  const spy = vi.fn();
  const user = userEvent.setup();
  render(<Harness spy={spy} {...props} />);
  return { spy, user };
}

const categoryGroup = () => screen.getByRole("group", { name: "Categories" });

describe("DiscoveryToolbar search", () => {
  it("renders a labelled search inside the Find recipes region", () => {
    setup();
    const region = screen.getByRole("region", { name: "Find recipes" });
    const input = within(region).getByLabelText("Search recipes by name");
    expect(input).toHaveAttribute("type", "search");
    expect(input).toHaveAttribute("placeholder", "Try pancakes, curry, or tart");
  });

  it("calls onChange per keystroke with the typed value and page 1", async () => {
    const { spy, user } = setup();
    await user.type(screen.getByLabelText("Search recipes by name"), "tart");
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls.map(([next]) => next.query)).toEqual(["t", "ta", "tar", "tart"]);
    for (const [next] of spy.mock.calls) expect(next.page).toBe(1);
    expect(screen.getByLabelText("Search recipes by name")).toHaveValue("tart");
  });

  it("does not submit or reload on Enter", async () => {
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault());
    document.addEventListener("submit", submit);
    const { user } = setup();
    await user.type(screen.getByLabelText("Search recipes by name"), "pie{Enter}");
    document.removeEventListener("submit", submit);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Search recipes by name")).toHaveValue("pie");
  });
});

describe("DiscoveryToolbar categories", () => {
  it("shows shortcuts in contract order with Breakfast first", () => {
    setup();
    const names = within(categoryGroup())
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual(["Breakfast", "Vegetarian", "Dessert", "Seafood", "Pasta", "Chicken", "More categories (8)"]);
    expect(within(categoryGroup()).getByText("Categories")).toBeInTheDocument();
  });

  it("filters shortcuts to available categories", () => {
    setup({ availableCategories: ["Seafood", "Dessert", "Breakfast", "Vegetarian"] });
    const names = within(categoryGroup())
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names).toEqual(["Breakfast", "Vegetarian", "Dessert", "Seafood"]);
  });

  it("toggles aria-pressed and resets page when a category is pressed", async () => {
    const { spy, user } = setup();
    const breakfast = screen.getByRole("button", { name: "Breakfast" });
    expect(breakfast).toHaveAttribute("aria-pressed", "false");
    await user.click(breakfast);
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, categories: ["Breakfast"], page: 1 });
    expect(screen.getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    expect(spy.mock.lastCall?.[0].categories).toEqual([]);
    expect(screen.getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "false");
  });

  it("allows multiple categories together", async () => {
    const { spy, user } = setup();
    await user.click(screen.getByRole("button", { name: "Breakfast" }));
    await user.click(screen.getByRole("button", { name: "Dessert" }));
    expect(spy.mock.lastCall?.[0].categories).toEqual(["Breakfast", "Dessert"]);
    expect(screen.getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dessert" })).toHaveAttribute("aria-pressed", "true");
  });

  it("expands and collapses the remaining categories alphabetically", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", { name: "More categories (8)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Beef" })).not.toBeInTheDocument();

    await user.click(toggle);
    const fewer = screen.getByRole("button", { name: "Fewer categories" });
    expect(fewer).toHaveAttribute("aria-expanded", "true");
    const names = within(categoryGroup())
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(names.slice(6, 14)).toEqual(["Beef", "Goat", "lamb", "Miscellaneous", "Pork", "Side", "Starter", "Vegan"]);
    for (const name of ["Beef", "Goat", "lamb", "Miscellaneous", "Pork", "Side", "Starter", "Vegan"]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-pressed", "false");
    }

    await user.click(fewer);
    expect(screen.getByRole("button", { name: "More categories (8)" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Beef" })).not.toBeInTheDocument();
  });

  it("omits the toggle when there are no remaining categories", () => {
    setup({ availableCategories: ["Breakfast", "Dessert"] });
    expect(screen.queryByRole("button", { name: /categories/ })).not.toBeInTheDocument();
  });

  it("still renders a selected category that is not available so it can be removed", async () => {
    const { spy, user } = setup({ initial: { categories: ["Unknown"] }, availableCategories: ["Breakfast"] });
    const unknown = within(categoryGroup()).getByRole("button", { name: "Unknown" });
    expect(unknown).toHaveAttribute("aria-pressed", "true");
    await user.click(unknown);
    expect(spy.mock.lastCall?.[0].categories).toEqual([]);
  });

  it("reaches search then category buttons with Tab and toggles with Space and Enter", async () => {
    const { user } = setup();
    await user.tab();
    expect(screen.getByLabelText("Search recipes by name")).toHaveFocus();
    await user.tab();
    const breakfast = screen.getByRole("button", { name: "Breakfast" });
    expect(breakfast).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Breakfast" })).toHaveAttribute("aria-pressed", "true");
    await user.tab();
    expect(screen.getByRole("button", { name: "Vegetarian" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Vegetarian" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("DiscoveryToolbar active filters", () => {
  it("does not render the active row without filters", () => {
    setup({ initial: { query: "   " } });
    expect(screen.queryByText("Showing")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("renders chips for the query and categories and removes each", async () => {
    const { spy, user } = setup({ initial: { query: "pie", categories: ["Dessert", "Beef"] } });
    expect(screen.getByText("Showing")).toBeInTheDocument();
    const searchChip = screen.getByRole("button", { name: 'Remove name contains "pie"' });
    expect(searchChip).toHaveTextContent('Name contains "pie"');
    expect(screen.getByRole("button", { name: "Remove Dessert" })).toHaveTextContent("Dessert×");

    await user.click(screen.getByRole("button", { name: "Remove Beef" }));
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, query: "pie", categories: ["Dessert"], page: 1 });

    await user.click(screen.getByRole("button", { name: 'Remove name contains "pie"' }));
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, query: "", categories: ["Dessert"], page: 1 });

    await user.click(screen.getByRole("button", { name: "Remove Dessert" }));
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, page: 1 });
    expect(screen.queryByText("Showing")).not.toBeInTheDocument();
  });

  it("clears query and categories but keeps sort and from", async () => {
    const { spy, user } = setup({
      initial: { from: "gallery", query: "cake", categories: ["Dessert"], sortBy: "category", direction: "desc" },
    });
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(spy).toHaveBeenLastCalledWith({
      from: "gallery",
      query: "",
      categories: [],
      sortBy: "category",
      direction: "desc",
      page: 1,
    });
    expect(screen.getByLabelText("Search recipes by name")).toHaveValue("");
  });
});

describe("DiscoveryToolbar results bar", () => {
  it("changes sort key and order with page 1", async () => {
    const { spy, user } = setup();
    await user.selectOptions(screen.getByLabelText("Sort by"), "category");
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, sortBy: "category", page: 1 });
    await user.selectOptions(screen.getByRole("combobox", { name: "Order" }), "desc");
    expect(spy).toHaveBeenLastCalledWith({ ...baseView, sortBy: "category", direction: "desc", page: 1 });
    expect(screen.getByRole("option", { name: "Z–A" })).toHaveProperty("selected", true);
    expect(screen.getByRole("option", { name: "Category" })).toHaveProperty("selected", true);
  });

  it("shows loading text in a polite live region", () => {
    setup({ loading: true, total: 0 });
    const count = screen.getByText("Loading recipes…");
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("does not report zero recipes when the catalog is unavailable", () => {
    setup({ unavailable: true, total: 0 });
    expect(screen.getByText("No recipes loaded")).toBeInTheDocument();
    expect(screen.queryByText(/^0 recipes/)).not.toBeInTheDocument();
  });

  it("shows unfiltered and filtered counts with singular forms", () => {
    const { unmount } = render(
      <DiscoveryToolbar view={baseView} availableCategories={allCategories} total={793} loading={false} onChange={() => {}} />,
    );
    expect(screen.getByText("793 recipes")).toBeInTheDocument();
    unmount();
    render(<DiscoveryToolbar view={baseView} availableCategories={allCategories} total={1} loading={false} onChange={() => {}} />);
    expect(screen.getByText("1 recipe")).toBeInTheDocument();
  });

  it("shows matching counts when filtered", () => {
    const { rerender } = render(
      <DiscoveryToolbar view={{ ...baseView, query: "pie" }} availableCategories={allCategories} total={68} loading={false} onChange={() => {}} />,
    );
    expect(screen.getByText("68 matching recipes")).toBeInTheDocument();
    rerender(
      <DiscoveryToolbar
        view={{ ...baseView, categories: ["Dessert"] }}
        availableCategories={allCategories}
        total={1}
        loading={false}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("1 matching recipe")).toBeInTheDocument();
  });

  it("renders the presentation slot", () => {
    setup({ presentation: <nav aria-label="Presentation">List | Gallery</nav> });
    expect(screen.getByRole("navigation", { name: "Presentation" })).toBeInTheDocument();
  });
});

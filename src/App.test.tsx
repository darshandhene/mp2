import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureDetail, fixtureMeals } from "./test/fixtures.ts";

vi.mock("./api/meals.ts", () => ({
  loadCatalog: vi.fn(),
  getMeal: vi.fn(),
  toErrorMessage: (error: unknown) => (error instanceof Error ? error.message : "Request failed"),
}));

const api = await import("./api/meals.ts");
const { default: App } = await import("./App.tsx");

function visit(path: string) {
  window.history.pushState(null, "", `${import.meta.env.BASE_URL}${path}`);
  return render(<App />);
}

describe("routing", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    vi.mocked(api.loadCatalog).mockResolvedValue({ items: fixtureMeals, failedCategories: [] });
    vi.mocked(api.getMeal).mockResolvedValue(fixtureDetail);
  });

  it("shows neutral branding", () => {
    visit("list");
    expect(screen.getByRole("link", { name: "Everyday Table" })).toBeInTheDocument();
    expect(screen.queryByText(/supper|dinner/i)).not.toBeInTheDocument();
  });

  it("redirects the root to the list view", async () => {
    visit("");
    expect(await screen.findByRole("heading", { level: 1, name: "Find your next meal" })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}list`);
    expect(await screen.findByRole("link", { name: "List" })).toHaveAttribute("aria-current", "page");
  });

  it("renders the gallery route", async () => {
    visit("gallery");
    expect(await screen.findByRole("link", { name: "Gallery" })).toHaveAttribute("aria-current", "page");
  });

  it("opens a recipe directly from its URL", async () => {
    visit("meal/1001");
    expect(await screen.findByRole("heading", { level: 1, name: "Breakfast Potatoes" })).toBeInTheDocument();
    expect(api.getMeal).toHaveBeenCalledWith("1001");
  });

  it("shows the not-found page for unknown paths", async () => {
    visit("does-not-exist");
    expect(await screen.findByRole("heading", { level: 1, name: /not on the menu/i })).toBeInTheDocument();
  });
});

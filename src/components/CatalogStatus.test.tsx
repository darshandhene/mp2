import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { MealsContextValue } from "../types/meal.ts";
import { useMeals } from "../context/MealsProvider.tsx";
import { CatalogStatus } from "./CatalogStatus.tsx";

vi.mock("../context/MealsProvider.tsx", () => ({ useMeals: vi.fn() }));

const mockedUseMeals = vi.mocked(useMeals);

function setMeals(overrides: Partial<MealsContextValue>) {
  const value: MealsContextValue = {
    items: [],
    status: "ready",
    failedCategories: [],
    error: null,
    retry: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
  mockedUseMeals.mockReturnValue(value);
  return value;
}

describe("CatalogStatus", () => {
  beforeEach(() => {
    mockedUseMeals.mockReset();
  });

  it("renders nothing while loading", () => {
    setMeals({ status: "loading" });
    const { container } = render(<CatalogStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when ready", () => {
    setMeals({ status: "ready" });
    const { container } = render(<CatalogStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an alert with the error detail and a retry button", () => {
    setMeals({ status: "error", error: "Network request failed." });
    render(<CatalogStatus />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Recipes could not be loaded.");
    expect(alert).toHaveTextContent("Network request failed.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("shows the error alert without detail when none is given", () => {
    setMeals({ status: "error", error: null });
    render(<CatalogStatus />);
    expect(screen.getByRole("alert")).toHaveTextContent(/^Recipes could not be loaded\.Retry$/);
  });

  it("names failed categories in a status notice", () => {
    setMeals({ status: "partial", failedCategories: ["Beef", "Pasta"] });
    render(<CatalogStatus />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Some categories did not load: Beef, Pasta. Showing the recipes that arrived.",
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("calls retry and disables the button while it is pending", async () => {
    let finish: () => void = () => {};
    const retry = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    setMeals({ status: "partial", failedCategories: ["Beef"], retry });
    render(<CatalogStatus />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
    const pendingButton = screen.getByRole("button", { name: "Retrying…" });
    expect(pendingButton).toBeDisabled();

    await act(async () => {
      finish();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
});

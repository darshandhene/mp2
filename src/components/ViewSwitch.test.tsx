import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ViewState } from "../types/meal.ts";
import { ViewSwitch } from "./ViewSwitch.tsx";

const view: ViewState = {
  from: "list",
  query: "pan cake",
  sortBy: "category",
  direction: "desc",
  categories: ["Breakfast", "Dessert"],
  page: 3,
};

describe("ViewSwitch", () => {
  it("keeps query, categories, sort, and page when switching presentation", () => {
    render(
      <MemoryRouter>
        <ViewSwitch view={view} />
      </MemoryRouter>,
    );
    const gallery = screen.getByRole("link", { name: "Gallery" });
    const url = new URL(gallery.getAttribute("href") ?? "", "https://example.test");
    expect(url.pathname).toBe("/gallery");
    expect(url.searchParams.get("from")).toBe("gallery");
    expect(url.searchParams.get("q")).toBe("pan cake");
    expect(url.searchParams.getAll("category")).toEqual(["Breakfast", "Dessert"]);
    expect(url.searchParams.get("sort")).toBe("category");
    expect(url.searchParams.get("direction")).toBe("desc");
    expect(url.searchParams.get("page")).toBe("3");
  });

  it("marks the current presentation", () => {
    render(
      <MemoryRouter>
        <ViewSwitch view={{ ...view, from: "gallery" }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "List" })).not.toHaveAttribute("aria-current");
  });
});

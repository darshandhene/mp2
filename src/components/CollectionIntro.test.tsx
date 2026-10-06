import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionIntro } from "./CollectionIntro.tsx";

describe("CollectionIntro", () => {
  it("shows the heading and the recipe count", () => {
    render(<CollectionIntro recipeCount={793} imageUrl={null} />);
    expect(screen.getByRole("heading", { level: 1, name: "Find your next meal" })).toBeInTheDocument();
    expect(
      screen.getByText("Search 793 recipes from TheMealDB by name, or start with a category like Breakfast."),
    ).toBeInTheDocument();
  });

  it("omits the count while it is unknown", () => {
    render(<CollectionIntro recipeCount={null} imageUrl={null} />);
    expect(
      screen.getByText("Search recipes from TheMealDB by name, or start with a category like Breakfast."),
    ).toBeInTheDocument();
  });

  it("renders a decorative eager image when a url is given", () => {
    const { container } = render(<CollectionIntro recipeCount={10} imageUrl="https://example.com/a.jpg" />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "eager");
  });

  it("renders no image element when the url is null", () => {
    const { container } = render(<CollectionIntro recipeCount={10} imageUrl={null} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

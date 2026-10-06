import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MealImage } from "./MealImage.tsx";

describe("MealImage", () => {
  it("renders a lazy, async-decoded image by default", () => {
    render(<MealImage src="https://example.com/a.jpg" alt="Apple Pie" />);
    const img = screen.getByRole("img", { name: "Apple Pie" });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("passes an explicit eager loading attribute", () => {
    render(<MealImage src="https://example.com/a.jpg" alt="Apple Pie" loading="eager" />);
    expect(screen.getByRole("img", { name: "Apple Pie" })).toHaveAttribute("loading", "eager");
  });

  it("shows an accessible fallback when src is null", () => {
    const { rerender } = render(<MealImage src={null} alt="Apple Pie" className="thumb" />);
    const fallback = screen.getByRole("img", { name: "Apple Pie" });
    expect(fallback.tagName).toBe("SPAN");
    expect(fallback).toHaveTextContent("No photo");
    expect(fallback).toHaveClass("thumb");

    rerender(<MealImage src={null} alt="" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back after a load error and retries when src changes", () => {
    const { rerender } = render(<MealImage src="https://example.com/broken.jpg" alt="Apple Pie" />);
    fireEvent.error(screen.getByRole("img", { name: "Apple Pie" }));
    expect(screen.getByRole("img", { name: "Apple Pie" }).tagName).toBe("SPAN");

    rerender(<MealImage src="https://example.com/b.jpg" alt="Apple Pie" />);
    const img = screen.getByRole("img", { name: "Apple Pie" });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://example.com/b.jpg");
  });
});

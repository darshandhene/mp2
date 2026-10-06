import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination.tsx";

function setup(page: number, pageCount: number) {
  const onPageChange = vi.fn();
  const utils = render(<Pagination page={page} pageCount={pageCount} onPageChange={onPageChange} />);
  return { onPageChange, ...utils };
}

describe("Pagination", () => {
  it("renders a Pages navigation with status text", () => {
    setup(2, 5);
    const nav = screen.getByRole("navigation", { name: "Pages" });
    expect(nav).toHaveTextContent("Page 2 of 5");
    expect(screen.getByText("Page 2 of 5")).toHaveAttribute("aria-live", "polite");
  });

  it("disables Previous on the first page", () => {
    setup(1, 3);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("enables both in the middle", () => {
    setup(2, 3);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    setup(3, 3);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("renders with both disabled for a single page", () => {
    setup(1, 1);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("calls onPageChange with the adjacent page", async () => {
    const user = userEvent.setup();
    const { onPageChange } = setup(2, 3);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });

  it("does not call onPageChange from a disabled button", async () => {
    const user = userEvent.setup();
    const { onPageChange } = setup(1, 1);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("updates the text when the page changes", () => {
    const { rerender, onPageChange } = setup(1, 4);
    rerender(<Pagination page={4} pageCount={4} onPageChange={onPageChange} />);
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });
});

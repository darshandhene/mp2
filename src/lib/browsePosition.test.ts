import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBrowsePosition,
  readBrowsePosition,
  saveBrowsePosition,
  useBrowsePosition,
} from "./browsePosition.ts";

const listKey = "/list?category=Breakfast&page=2";

describe("browse position storage", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("saves and reads a rounded offset per collection key", () => {
    saveBrowsePosition(listKey, 812.6);
    expect(readBrowsePosition(listKey)).toBe(813);
    expect(readBrowsePosition("/list?category=Dessert")).toBeNull();
  });

  it("ignores negative and non-finite offsets", () => {
    saveBrowsePosition(listKey, -10);
    saveBrowsePosition(listKey, Number.NaN);
    expect(readBrowsePosition(listKey)).toBeNull();
  });

  it("rejects malformed stored values", () => {
    window.sessionStorage.setItem(`everyday-table:position:${listKey}`, "12px");
    expect(readBrowsePosition(listKey)).toBeNull();
  });

  it("clears a saved offset", () => {
    saveBrowsePosition(listKey, 400);
    clearBrowsePosition(listKey);
    expect(readBrowsePosition(listKey)).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    const spy = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveBrowsePosition(listKey, 100)).not.toThrow();
    expect(readBrowsePosition(listKey)).toBeNull();
    expect(() => clearBrowsePosition(listKey)).not.toThrow();
    spy.mockRestore();
  });

  it("does not throw when writes fail", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveBrowsePosition(listKey, 100)).not.toThrow();
    spy.mockRestore();
  });
});

describe("useBrowsePosition", () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.sessionStorage.clear();
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  afterEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("waits until results are ready, then restores once and forgets the offset", () => {
    saveBrowsePosition(listKey, 640);
    const { rerender } = renderHook(({ ready }) => useBrowsePosition(listKey, ready), {
      initialProps: { ready: false },
    });
    expect(scrollTo).not.toHaveBeenCalled();
    rerender({ ready: true });
    expect(scrollTo).toHaveBeenCalledWith(0, 640);
    expect(readBrowsePosition(listKey)).toBeNull();
    rerender({ ready: true });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("does not apply an offset saved for a different collection", () => {
    saveBrowsePosition(listKey, 640);
    renderHook(() => useBrowsePosition("/list?category=Dessert", true));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("remember stores the current scroll offset under the key", () => {
    Object.defineProperty(window, "scrollY", { value: 1250, configurable: true });
    const { result } = renderHook(() => useBrowsePosition(listKey, true));
    result.current.remember();
    expect(readBrowsePosition(listKey)).toBe(1250);
  });
});

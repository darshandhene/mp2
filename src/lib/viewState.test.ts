import { describe, expect, it } from "vitest";
import type { ViewState } from "../types/meal.ts";
import { directionFrom, hrefFor, parseViewState, serializeViewState, sortKeyFrom } from "./viewState.ts";

const DEFAULTS: ViewState = {
  from: "list",
  query: "",
  sortBy: "name",
  direction: "asc",
  categories: [],
  page: 1,
};

function parse(search: string): ViewState {
  return parseViewState(new URLSearchParams(search));
}

function roundTrip(state: ViewState): ViewState {
  return parseViewState(new URLSearchParams(serializeViewState(state).toString()));
}

describe("parseViewState", () => {
  it("returns defaults when params are absent", () => {
    expect(parse("")).toEqual(DEFAULTS);
  });

  it("reads every field", () => {
    expect(
      parse("from=gallery&q=pie&sort=category&direction=desc&category=Dessert&category=Seafood&page=3"),
    ).toEqual({
      from: "gallery",
      query: "pie",
      sortBy: "category",
      direction: "desc",
      categories: ["Dessert", "Seafood"],
      page: 3,
    });
  });

  it("falls back to defaults for malformed enums", () => {
    expect(parse("from=grid&sort=price&direction=up")).toEqual(DEFAULTS);
    expect(parse("from=GALLERY&sort=Category&direction=DESC")).toEqual(DEFAULTS);
  });

  it("treats empty values as defaults", () => {
    expect(parse("from=&q=&sort=&direction=&category=&page=")).toEqual(DEFAULTS);
  });

  it("trims, drops blank, and deduplicates repeated categories in first-seen order", () => {
    expect(parse("category=%20Dessert%20&category=Seafood&category=Dessert&category=%20%20").categories).toEqual([
      "Dessert",
      "Seafood",
    ]);
  });

  it("decodes escaped and Unicode values", () => {
    const state = parse("q=crème%20brûlée&category=Fish%20%26%20Chips&category=A%2BB%23C");
    expect(state.query).toBe("crème brûlée");
    expect(state.categories).toEqual(["Fish & Chips", "A+B#C"]);
  });

  it("reads a positive decimal page", () => {
    expect(parse("page=3").page).toBe(3);
    expect(parse("page=1").page).toBe(1);
    expect(parse(`page=${Number.MAX_SAFE_INTEGER}`).page).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each(["0", "-2", "2.5", "abc", "", "1e3", "+3", " 3", "3 ", "0x10", "9007199254740992", "99999999999999999999"])(
    "rejects page=%j as 1",
    (value) => {
      const params = new URLSearchParams();
      params.set("page", value);
      expect(parseViewState(params).page).toBe(1);
    },
  );

  it("gives page 1 for old URLs without page", () => {
    expect(parse("q=pie&sort=category").page).toBe(1);
  });
});

describe("serializeViewState", () => {
  it("omits all defaults", () => {
    expect(serializeViewState(DEFAULTS).toString()).toBe("");
  });

  it("writes non-defaults in order with page last", () => {
    const params = serializeViewState({
      from: "gallery",
      query: "pie",
      sortBy: "category",
      direction: "desc",
      categories: ["Dessert", "Seafood"],
      page: 2,
    });
    expect([...params.entries()]).toEqual([
      ["from", "gallery"],
      ["q", "pie"],
      ["sort", "category"],
      ["direction", "desc"],
      ["category", "Dessert"],
      ["category", "Seafood"],
      ["page", "2"],
    ]);
  });

  it("omits page when it is 1", () => {
    expect(serializeViewState({ ...DEFAULTS, query: "pie", page: 1 }).has("page")).toBe(false);
  });

  it("escapes reserved characters", () => {
    const search = serializeViewState({ ...DEFAULTS, query: "mac & cheese #1 + more", categories: ["A&B"] }).toString();
    expect(search).not.toContain("#");
    expect(search.split("&")).toHaveLength(2);
    expect(parse(search)).toEqual({ ...DEFAULTS, query: "mac & cheese #1 + more", categories: ["A&B"] });
  });
});

describe("round trips", () => {
  it.each<ViewState>([
    DEFAULTS,
    { ...DEFAULTS, from: "gallery" },
    { ...DEFAULTS, query: "Æbleskiver" },
    { ...DEFAULTS, query: "crème brûlée", sortBy: "category", direction: "desc" },
    { ...DEFAULTS, query: "a+b & c #d", categories: ["Fish & Chips", "Side"] },
    { from: "gallery", query: "pancakes", sortBy: "category", direction: "desc", categories: ["Dessert", "Vegetarian"], page: 4 },
  ])("preserves %j", (state) => {
    expect(roundTrip(state)).toEqual(state);
  });
});

describe("hrefFor and enum helpers", () => {
  it("omits the query string for defaults", () => {
    expect(hrefFor("/meals/1", DEFAULTS)).toBe("/meals/1");
  });

  it("appends the serialized state", () => {
    expect(hrefFor("/gallery", { ...DEFAULTS, from: "gallery", page: 2 })).toBe("/gallery?from=gallery&page=2");
  });

  it("parses sort keys and directions", () => {
    expect(sortKeyFrom("category")).toBe("category");
    expect(sortKeyFrom("other")).toBe("name");
    expect(directionFrom("desc")).toBe("desc");
    expect(directionFrom("other")).toBe("asc");
  });
});

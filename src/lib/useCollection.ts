import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMeals } from "../context/MealsProvider.tsx";
import type { CatalogStatus, MealSummary, Page, ViewOrigin, ViewState } from "../types/meal.ts";
import { useBrowsePosition } from "./browsePosition.ts";
import { paginate, selectCollection } from "./catalog.ts";
import { hrefFor, parseViewState, serializeViewState } from "./viewState.ts";

// Dutch poffertjes, the photo used in the approved intro proposal.
const FEATURED_MEAL_ID = "53379";

export type Collection = {
  view: ViewState;
  status: CatalogStatus;
  /** Nothing has loaded yet; show skeletons. */
  waiting: boolean;
  /** Loading failed with no recipes to show. */
  unavailable: boolean;
  catalogSize: number;
  categories: string[];
  featuredImageUrl: string | null;
  results: Page<MealSummary>;
  setView: (next: ViewState) => void;
  goToPage: (page: number) => void;
  detailHref: (mealId: string) => string;
  rememberPosition: () => void;
};

function compareNames(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

export function useCollection(from: ViewOrigin): Collection {
  const meals = useMeals();
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const view = useMemo(() => ({ ...parseViewState(new URLSearchParams(search)), from }), [search, from]);

  const hasItems = meals.items.length > 0;
  const waiting = !hasItems && meals.status === "loading";
  const unavailable = !hasItems && meals.status === "error";

  const matches = useMemo(() => selectCollection(meals.items, view), [meals.items, view]);
  const results = useMemo(() => paginate(matches, view.page), [matches, view.page]);

  const categories = useMemo(
    () =>
      [...new Set([...meals.items.map((meal) => meal.category), ...meals.failedCategories])].sort(compareNames),
    [meals.items, meals.failedCategories],
  );

  const featuredImageUrl = useMemo(() => {
    const featured =
      meals.items.find((meal) => meal.id === FEATURED_MEAL_ID && meal.imageUrl) ??
      meals.items.find((meal) => meal.imageUrl);
    return featured?.imageUrl ?? null;
  }, [meals.items]);

  useEffect(() => {
    if (hasItems && results.page !== view.page) {
      setParams(serializeViewState({ ...view, page: results.page }), { replace: true });
    }
  }, [hasItems, results.page, view, setParams]);

  const setView = useCallback(
    (next: ViewState) => {
      const typing = next.query !== view.query;
      setParams(serializeViewState({ ...next, from }), { replace: typing });
    },
    [view.query, from, setParams],
  );

  const goToPage = useCallback(
    (page: number) => setParams(serializeViewState({ ...view, page })),
    [view, setParams],
  );

  const settled = useMemo(() => ({ ...view, page: results.page }), [view, results.page]);
  const { remember } = useBrowsePosition(hrefFor(`/${from}`, settled), hasItems);

  const detailHref = useCallback(
    (mealId: string) => hrefFor(`/meal/${encodeURIComponent(mealId)}`, settled),
    [settled],
  );

  return {
    view: settled,
    status: meals.status,
    waiting,
    unavailable,
    catalogSize: meals.items.length,
    categories,
    featuredImageUrl,
    results,
    setView,
    goToPage,
    detailHref,
    rememberPosition: remember,
  };
}

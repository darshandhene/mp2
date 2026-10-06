import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadCatalog, toErrorMessage } from "../api/meals.ts";
import type { CatalogStatus, MealSummary, MealsContextValue } from "../types/meal.ts";

const MealsContext = createContext<MealsContextValue | null>(null);

export function useMeals(): MealsContextValue {
  const value = useContext(MealsContext);
  if (!value) throw new Error("useMeals must be used within MealsProvider");
  return value;
}

export function MealsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MealSummary[]>([]);
  const [status, setStatus] = useState<CatalogStatus>("loading");
  const [failedCategories, setFailedCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: { items: MealSummary[]; failedCategories: string[] }) => {
    setItems(result.items);
    setFailedCategories(result.failedCategories);
    if (result.failedCategories.length === 0) {
      setStatus("ready");
      setError(null);
      return;
    }
    if (result.items.length === 0) {
      setStatus("error");
      setError("The meal list could not be loaded.");
      return;
    }
    setStatus("partial");
    setError(null);
  }, []);

  const retry = useCallback(async () => {
    try {
      apply(await loadCatalog());
    } catch (caught) {
      setStatus("error");
      setError(toErrorMessage(caught));
    }
  }, [apply]);

  useEffect(() => {
    let active = true;
    loadCatalog().then(
      (result) => {
        if (active) apply(result);
      },
      (caught: unknown) => {
        if (!active) return;
        setStatus("error");
        setError(toErrorMessage(caught));
      },
    );
    return () => {
      active = false;
    };
  }, [apply]);

  const value = useMemo(
    () => ({ items, status, failedCategories, error, retry }),
    [items, status, failedCategories, error, retry],
  );

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

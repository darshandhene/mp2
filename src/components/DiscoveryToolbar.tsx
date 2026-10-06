import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { SortDirection, SortKey, ViewState } from "../types/meal.ts";
import styles from "./DiscoveryToolbar.module.css";

const SHORTCUT_CATEGORIES = ["Breakfast", "Vegetarian", "Dessert", "Seafood", "Pasta", "Chicken"];

type DiscoveryToolbarProps = {
  view: ViewState;
  availableCategories: string[];
  total: number;
  loading: boolean;
  /** Loading failed and there is nothing to count. */
  unavailable?: boolean;
  onChange: (next: ViewState) => void;
  presentation?: ReactNode;
};

function countText(total: number, loading: boolean, unavailable: boolean, filtered: boolean): string {
  if (loading) return "Loading recipes…";
  if (unavailable) return "No recipes loaded";
  const noun = total === 1 ? "recipe" : "recipes";
  return filtered ? `${total} matching ${noun}` : `${total} ${noun}`;
}

export function DiscoveryToolbar({
  view,
  availableCategories,
  total,
  loading,
  unavailable = false,
  onChange,
  presentation,
}: DiscoveryToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const searchId = useId();
  const sortId = useId();

  const update = (patch: Partial<ViewState>) => onChange({ ...view, ...patch, page: 1 });

  const available = new Set(availableCategories);
  const shortcuts = SHORTCUT_CATEGORIES.filter((name) => available.has(name));
  const remaining = availableCategories
    .filter((name) => !SHORTCUT_CATEGORIES.includes(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const unavailableSelected = view.categories.filter((name) => !available.has(name));
  const visibleCategories = [...shortcuts, ...(expanded ? remaining : []), ...unavailableSelected];

  const query = view.query.trim();
  const filtered = query !== "" || view.categories.length > 0;

  const toggleCategory = (name: string) =>
    update({
      categories: view.categories.includes(name)
        ? view.categories.filter((selected) => selected !== name)
        : [...view.categories, name],
    });

  return (
    <>
      <section className={styles.discover} aria-label="Find recipes">
        <label className={styles.searchLabel} htmlFor={searchId}>
          Search recipes by name
        </label>
        <input
          id={searchId}
          className={styles.search}
          type="search"
          placeholder="Try pancakes, curry, or tart"
          autoComplete="off"
          value={view.query}
          onChange={(event) => update({ query: event.target.value })}
        />

        <div className={styles.categories} role="group" aria-label="Categories">
          <span className={styles.categoriesLabel}>Categories</span>
          {visibleCategories.map((name) => (
            <button
              key={name}
              className={styles.chip}
              type="button"
              aria-pressed={view.categories.includes(name)}
              onClick={() => toggleCategory(name)}
            >
              {name}
            </button>
          ))}
          {remaining.length > 0 && (
            <button className={styles.more} type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? "Fewer categories" : `More categories (${remaining.length})`}
            </button>
          )}
        </div>

        {filtered && (
          <div className={styles.active}>
            <span className={styles.activeLabel}>Showing</span>
            {query !== "" && (
              <button
                className={styles.remove}
                type="button"
                aria-label={`Remove name contains "${view.query}"`}
                onClick={() => update({ query: "" })}
              >
                Name contains "{view.query}"<span aria-hidden="true">×</span>
              </button>
            )}
            {view.categories.map((name) => (
              <button key={name} className={styles.remove} type="button" aria-label={`Remove ${name}`} onClick={() => toggleCategory(name)}>
                {name}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <button className={styles.clear} type="button" onClick={() => update({ query: "", categories: [] })}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <div className={styles.bar}>
        <p className={styles.count} aria-live="polite">
          {countText(total, loading, unavailable, filtered)}
        </p>
        <div className={styles.sort}>
          <label htmlFor={sortId}>Sort by</label>
          <select
            id={sortId}
            className={styles.select}
            value={view.sortBy}
            onChange={(event) => update({ sortBy: event.target.value as SortKey })}
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
          <select
            aria-label="Order"
            className={styles.select}
            value={view.direction}
            onChange={(event) => update({ direction: event.target.value as SortDirection })}
          >
            <option value="asc">A–Z</option>
            <option value="desc">Z–A</option>
          </select>
        </div>
        {presentation}
      </div>
    </>
  );
}

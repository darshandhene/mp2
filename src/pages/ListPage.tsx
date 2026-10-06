import { Link, useSearchParams } from "react-router-dom";
import { MealImage } from "../components/MealImage.tsx";
import { useMeals } from "../context/MealsProvider.tsx";
import { selectList } from "../lib/catalog.ts";
import { directionFrom, hrefFor, parseViewState, serializeViewState, sortKeyFrom } from "../lib/viewState.ts";
import type { ViewState } from "../types/meal.ts";
import styles from "./ListPage.module.css";

export function ListPage() {
  const meals = useMeals();
  const [params, setParams] = useSearchParams();
  const view = parseViewState(params);
  const results = selectList(meals.items, view.query, view.sortBy, view.direction);
  const catalogMissing = meals.status === "error" && meals.items.length === 0;
  const waiting = meals.status === "loading" && meals.items.length === 0;

  function update(partial: Partial<ViewState>) {
    setParams(serializeViewState({ ...view, from: "list", ...partial }), { replace: true });
  }

  return (
    <section className={styles.sheet}>
      <h1>Meals</h1>
      <form className={styles.toolbar} role="search" onSubmit={(event) => event.preventDefault()}>
        <label className={styles.field}>
          Search meals
          <input
            type="search"
            value={view.query}
            placeholder="Search by name"
            onChange={(event) => update({ query: event.target.value })}
          />
        </label>
        <label className={styles.field}>
          Sort by
          <select value={view.sortBy} onChange={(event) => update({ sortBy: sortKeyFrom(event.target.value) })}>
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
        </label>
        <label className={styles.field}>
          Order
          <select
            value={view.direction}
            onChange={(event) => update({ direction: directionFrom(event.target.value) })}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
        {view.query.trim() ? (
          <button type="button" className={styles.clear} onClick={() => update({ query: "" })}>
            Clear search
          </button>
        ) : null}
      </form>
      <p className={styles.count} aria-live="polite">
        {catalogMissing ? "No meals loaded" : `${results.length} meal${results.length === 1 ? "" : "s"}`}
      </p>
      {catalogMissing || waiting ? null : results.length === 0 ? (
        <p className={styles.empty}>No meals match that search.</p>
      ) : (
        <ul className={styles.results}>
          {results.map((meal) => (
            <li key={meal.id}>
              <Link className={styles.row} to={hrefFor(`/meal/${meal.id}`, { ...view, from: "list" })}>
                <MealImage src={meal.imageUrl} alt="" className={styles.thumb} />
                <span className={styles.name}>{meal.name}</span>
                <span className={styles.category}>{meal.category}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

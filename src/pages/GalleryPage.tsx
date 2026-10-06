import { Link, useSearchParams } from "react-router-dom";
import { MealImage } from "../components/MealImage.tsx";
import { useMeals } from "../context/MealsProvider.tsx";
import { selectGallery } from "../lib/catalog.ts";
import { hrefFor, parseViewState, serializeViewState } from "../lib/viewState.ts";
import type { MealSummary, ViewState } from "../types/meal.ts";
import styles from "./GalleryPage.module.css";

function categoryNames(items: readonly MealSummary[], failed: readonly string[], selected: readonly string[]) {
  return [...new Set([...items.map((item) => item.category), ...failed, ...selected])].sort((left, right) =>
    left.localeCompare(right, "en", { sensitivity: "base" }),
  );
}

export function GalleryPage() {
  const meals = useMeals();
  const [params, setParams] = useSearchParams();
  const view = parseViewState(params);
  const results = selectGallery(meals.items, view.categories);
  const categories = categoryNames(meals.items, meals.failedCategories, view.categories);
  const catalogMissing = meals.status === "error" && meals.items.length === 0;
  const waiting = meals.status === "loading" && meals.items.length === 0;

  function update(partial: Partial<ViewState>) {
    setParams(serializeViewState({ ...view, from: "gallery", ...partial }), { replace: true });
  }

  function toggle(category: string) {
    const selected = view.categories.includes(category)
      ? view.categories.filter((item) => item !== category)
      : [...view.categories, category];
    update({ categories: selected });
  }

  return (
    <section className={styles.sheet}>
      <h1>Gallery</h1>
      <div className={styles.filters} role="group" aria-label="Categories">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={styles.chip}
            aria-pressed={view.categories.includes(category)}
            onClick={() => toggle(category)}
          >
            {category}
          </button>
        ))}
        {view.categories.length > 0 ? (
          <button type="button" className={styles.clear} onClick={() => update({ categories: [] })}>
            Clear filters
          </button>
        ) : null}
      </div>
      {view.categories.length > 1 ? <p className={styles.hint}>Showing meals in any selected category.</p> : null}
      <p className={styles.count} aria-live="polite">
        {catalogMissing ? "No meals loaded" : `${results.length} meal${results.length === 1 ? "" : "s"}`}
      </p>
      {catalogMissing || waiting ? null : results.length === 0 ? (
        <p className={styles.empty}>No meals match those categories.</p>
      ) : (
        <ul className={styles.grid}>
          {results.map((meal) => (
            <li key={meal.id}>
              <Link className={styles.card} to={hrefFor(`/meal/${meal.id}`, { ...view, from: "gallery" })}>
                <MealImage src={meal.imageUrl} alt="" className={styles.photo} />
                <span className={styles.caption}>
                  <span className={styles.name}>{meal.name}</span>
                  <span className={styles.category}>{meal.category}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

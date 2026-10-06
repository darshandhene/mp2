import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMeal, toErrorMessage } from "../api/meals.ts";
import { MealImage } from "../components/MealImage.tsx";
import { useMeals } from "../context/MealsProvider.tsx";
import { detailCollection, getNeighbors } from "../lib/catalog.ts";
import { hrefFor, parseViewState } from "../lib/viewState.ts";
import type { MealDetail } from "../types/meal.ts";
import styles from "./DetailPage.module.css";

type RecipeState = {
  id: string;
  meal: MealDetail | null;
  error: string | null;
};

export function DetailPage() {
  const { id = "" } = useParams();
  const meals = useMeals();
  const [params] = useSearchParams();
  const view = parseViewState(params);
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<RecipeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeal(id).then(
      (meal) => {
        if (!cancelled) setRequest({ id, meal, error: null });
      },
      (caught: unknown) => {
        if (!cancelled) setRequest({ id, meal: null, error: toErrorMessage(caught) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const current = request?.id === id ? request : null;
  const collection = detailCollection(meals.items, id, view);
  const neighbors =
    meals.items.length > 0 ? getNeighbors(collection.ids, id) : { previous: null, next: null };
  const backHref = hrefFor(collection.state.from === "gallery" ? "/gallery" : "/list", collection.state);

  useEffect(() => {
    document.title = current?.meal ? `${current.meal.name} — Supper` : "Supper";
    return () => {
      document.title = "Supper";
    };
  }, [current]);

  const note = navigationNote(meals.status, meals.items.length, collection.inCatalog, neighbors);

  return (
    <>
      <nav className={styles.pager} aria-label="Recipe sequence">
        {neighbors.previous ? (
          <Link to={hrefFor(`/meal/${neighbors.previous}`, collection.state)}>Previous</Link>
        ) : (
          <button type="button" disabled>
            Previous
          </button>
        )}
        <Link to={backHref}>Back to results</Link>
        {neighbors.next ? (
          <Link to={hrefFor(`/meal/${neighbors.next}`, collection.state)}>Next</Link>
        ) : (
          <button type="button" disabled>
            Next
          </button>
        )}
      </nav>
      {note ? <p className={styles.note}>{note}</p> : null}
      {!current ? <p className={styles.pending}>Loading this recipe…</p> : null}
      {current?.error ? (
        <div className={styles.sheet} role="alert">
          <p>{current.error}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      ) : null}
      {current && !current.error && !current.meal ? (
        <div className={styles.sheet}>
          <h1>Recipe not found</h1>
          <p>TheMealDB has no recipe for this address.</p>
          <Link to="/list">Browse recipes</Link>
        </div>
      ) : null}
      {current?.meal ? <Recipe meal={current.meal} /> : null}
    </>
  );
}

function navigationNote(
  status: string,
  itemCount: number,
  inCatalog: boolean,
  neighbors: { previous: string | null; next: string | null },
): string | null {
  if (itemCount === 0) {
    return "Previous and next are unavailable until the meal list loads.";
  }
  if (!inCatalog) return "This recipe is outside the loaded meal list, so previous and next are unavailable.";
  if (!neighbors.previous && !neighbors.next) return "This is the only meal in the current list.";
  if (status === "partial") {
    return "Some categories did not load, so previous and next stay within the meals that arrived.";
  }
  return null;
}

function Recipe({ meal }: { meal: MealDetail }) {
  return (
    <article className={styles.sheet}>
      <div className={styles.layout}>
        <MealImage src={meal.imageUrl} alt={meal.name} className={styles.photo} />
        <div>
          <h1>{meal.name}</h1>
          <p className={styles.meta}>
            {meal.category}
            {meal.area ? `, ${meal.area}` : ""}
          </p>
          <h2>Ingredients</h2>
          {meal.ingredients.length === 0 ? (
            <p>This recipe has no listed ingredients.</p>
          ) : (
            <ul className={styles.ingredients}>
              {meal.ingredients.map((ingredient, index) => (
                <li key={`${ingredient.name}-${index}`}>
                  {ingredient.measure ? <span className={styles.measure}>{ingredient.measure}</span> : null}
                  <span>{ingredient.name}</span>
                </li>
              ))}
            </ul>
          )}
          <h2>Instructions</h2>
          <p className={styles.instructions}>
            {meal.instructions || "This recipe has no written instructions."}
          </p>
          {meal.sourceUrl || meal.youtubeUrl ? (
            <p className={styles.links}>
              {meal.sourceUrl ? (
                <a href={meal.sourceUrl} target="_blank" rel="noreferrer">
                  Recipe source
                </a>
              ) : null}
              {meal.youtubeUrl ? (
                <a href={meal.youtubeUrl} target="_blank" rel="noreferrer">
                  Video
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

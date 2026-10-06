import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getMeal, toErrorMessage } from "../api/meals.ts";
import { MealImage } from "../components/MealImage.tsx";
import { useMeals } from "../context/MealsProvider.tsx";
import { detailCollection, getNeighbors, pageForIndex } from "../lib/catalog.ts";
import { hrefFor, parseViewState } from "../lib/viewState.ts";
import type { MealDetail, ViewState } from "../types/meal.ts";
import styles from "./DetailPage.module.css";

const SITE_TITLE = "Everyday Table";

type RecipeState = {
  id: string;
  meal: MealDetail | null;
  error: string | null;
};

type Position = { index: number; total: number; state: ViewState };

type StepTarget = { href: string; name: string };

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
  const { ids, state, inCatalog } = detailCollection(meals.items, id, view);
  const neighbors =
    meals.items.length > 0 ? getNeighbors(ids, id) : { previous: null, next: null };
  const index = ids.indexOf(id);
  const linkTo = (pathname: string, targetId: string) =>
    hrefFor(pathname, { ...state, page: pageForIndex(ids.indexOf(targetId)) });
  const backHref = linkTo(state.from === "gallery" ? "/gallery" : "/list", id);
  const backLabel =
    state.categories.length > 0
      ? `Back to ${state.categories.join(" and ")} recipes`
      : "Back to all recipes";
  const position = index >= 0 ? { index, total: ids.length, state } : null;
  const stepTarget = (targetId: string | null): StepTarget | null =>
    targetId
      ? {
          href: linkTo(`/meal/${targetId}`, targetId),
          name: meals.items.find((item) => item.id === targetId)?.name ?? "",
        }
      : null;

  const mealName = current?.meal?.name;
  useEffect(() => {
    if (!mealName) return;
    document.title = `${mealName} — ${SITE_TITLE}`;
    return () => {
      document.title = SITE_TITLE;
    };
  }, [mealName]);

  const note = navigationNote(meals.status, meals.items.length, inCatalog, neighbors);

  return (
    <>
      <nav className={styles.nav} aria-label="Recipe navigation">
        <Link className={styles.back} to={backHref}>
          {backLabel}
        </Link>
        <div className={styles.steps}>
          <Step label="Previous" target={stepTarget(neighbors.previous)} />
          <Step label="Next" target={stepTarget(neighbors.next)} className={styles.stepNext} />
        </div>
      </nav>
      {note ? <p className={styles.note}>{note}</p> : null}
      {!current ? <p className={styles.pending}>Loading this recipe…</p> : null}
      {current?.error ? (
        <div className={styles.panel} role="alert">
          <p>{current.error}</p>
          <button className={styles.action} type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </button>
        </div>
      ) : null}
      {current && !current.error && !current.meal ? (
        <div className={styles.panel}>
          <h1>Recipe not found</h1>
          <p>TheMealDB has no recipe for this address.</p>
          <Link className={styles.action} to="/list">
            Browse recipes
          </Link>
        </div>
      ) : null}
      {current?.meal ? <Recipe meal={current.meal} position={position} /> : null}
    </>
  );
}

function Step({ label, target, className }: { label: string; target: StepTarget | null; className?: string }) {
  const classes = [styles.step, className].filter(Boolean).join(" ");
  if (!target) {
    return (
      <button className={classes} type="button" disabled>
        <small className={styles.stepLabel}>{label}</small>
      </button>
    );
  }
  return (
    <Link className={classes} to={target.href}>
      <small className={styles.stepLabel}>{label}</small>
      <span className={styles.stepName}>{target.name}</span>
    </Link>
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

function describePosition({ index, total, state }: Position): string {
  const scope = state.categories.length > 0 ? ` in ${state.categories.join(" and ")}` : "";
  return `Recipe ${index + 1} of ${total}${scope}, sorted by ${state.sortBy}.`;
}

function paragraphsOf(instructions: string): string[] {
  return instructions
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function Recipe({ meal, position }: { meal: MealDetail; position: Position | null }) {
  const paragraphs = paragraphsOf(meal.instructions);
  return (
    <article className={styles.article}>
      <section className={styles.hero}>
        <MealImage src={meal.imageUrl} alt={meal.name} className={styles.photo} loading="eager" />
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{meal.name}</h1>
          <p className={styles.tags}>
            <span className={styles.tag}>{meal.category}</span>
            {meal.area ? <span className={styles.tag}>{meal.area}</span> : null}
          </p>
          {position ? <p className={styles.position}>{describePosition(position)}</p> : null}
        </div>
      </section>
      <div className={styles.recipe}>
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className={styles.heading}>
            Ingredients
          </h2>
          {meal.ingredients.length === 0 ? (
            <p className={styles.empty}>This recipe has no listed ingredients.</p>
          ) : (
            <ul className={styles.ingredients} aria-labelledby="ingredients-heading">
              {meal.ingredients.map((ingredient, index) => (
                <li className={styles.ingredient} key={`${ingredient.name}-${index}`}>
                  <span className={styles.measure}>{ingredient.measure}</span>
                  <span className={styles.ingredientName}>{ingredient.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={styles.method} aria-labelledby="instructions-heading">
          <h2 id="instructions-heading" className={styles.heading}>
            Instructions
          </h2>
          {paragraphs.length === 0 ? (
            <p className={styles.empty}>This recipe has no written instructions.</p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p className={styles.paragraph} key={index}>
                {paragraph}
              </p>
            ))
          )}
          {meal.sourceUrl || meal.youtubeUrl ? (
            <div className={styles.links}>
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
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

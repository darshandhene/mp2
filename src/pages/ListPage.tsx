import { useId, useRef } from "react";
import { Link } from "react-router-dom";
import { CollectionIntro } from "../components/CollectionIntro.tsx";
import { DiscoveryToolbar } from "../components/DiscoveryToolbar.tsx";
import { MealImage } from "../components/MealImage.tsx";
import { Pagination } from "../components/Pagination.tsx";
import { ViewSwitch } from "../components/ViewSwitch.tsx";
import { useCollection } from "../lib/useCollection.ts";
import styles from "./ListPage.module.css";

const EAGER_IMAGES = 8;
const SKELETON_ROWS = Array.from({ length: 8 }, (_, index) => index);

export function ListPage() {
  const {
    view,
    waiting,
    unavailable,
    catalogSize,
    categories,
    featuredImageUrl,
    results,
    setView,
    goToPage,
    detailHref,
    rememberPosition,
  } = useCollection("list");
  const listRef = useRef<HTMLUListElement>(null);
  const emptyHeadingId = useId();

  const changePage = (page: number) => {
    goToPage(page);
    listRef.current?.scrollIntoView({ block: "start" });
  };

  let body = null;
  if (waiting) {
    body = (
      <ul className={styles.rows} aria-hidden="true">
        {SKELETON_ROWS.map((index) => (
          <li key={index} className={styles.skeleton}>
            <span className={styles.skeletonPhoto} />
            <span className={styles.text}>
              <span className={styles.skeletonName} />
              <span className={styles.skeletonCategory} />
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (unavailable) {
    // CatalogStatus, rendered by App above every route, explains and offers Retry.
  } else if (results.items.length === 0) {
    body = (
      <section className={styles.empty} aria-labelledby={emptyHeadingId}>
        <h2 id={emptyHeadingId} className={styles.emptyTitle}>
          No recipes match your search
        </h2>
        <p className={styles.emptyText}>Try a different name or fewer categories.</p>
        <button
          className={styles.emptyButton}
          type="button"
          onClick={() => setView({ ...view, query: "", categories: [], page: 1 })}
        >
          Show all recipes
        </button>
      </section>
    );
  } else {
    body = (
      <>
        <ul ref={listRef} className={styles.rows} aria-label="Recipes">
          {results.items.map((meal, index) => (
            <li key={meal.id}>
              <Link className={styles.row} to={detailHref(meal.id)} onClick={rememberPosition}>
                <MealImage
                  src={meal.imageUrl}
                  alt=""
                  className={styles.photo}
                  loading={index < EAGER_IMAGES ? "eager" : "lazy"}
                />
                <span className={styles.text}>
                  <span className={styles.name} data-name>
                    {meal.name}
                  </span>
                  <span className={styles.category} data-category>
                    {meal.category}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Pagination page={results.page} pageCount={results.pageCount} onPageChange={changePage} />
      </>
    );
  }

  return (
    <>
      <CollectionIntro recipeCount={waiting || unavailable ? null : catalogSize} imageUrl={featuredImageUrl} />
      <DiscoveryToolbar
        view={view}
        availableCategories={categories}
        total={results.total}
        loading={waiting}
        unavailable={unavailable}
        onChange={setView}
        presentation={<ViewSwitch view={view} />}
      />
      {body}
    </>
  );
}

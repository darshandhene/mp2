import { useRef } from "react";
import { Link } from "react-router-dom";
import { CollectionIntro } from "../components/CollectionIntro.tsx";
import { DiscoveryToolbar } from "../components/DiscoveryToolbar.tsx";
import { MealImage } from "../components/MealImage.tsx";
import { Pagination } from "../components/Pagination.tsx";
import { ViewSwitch } from "../components/ViewSwitch.tsx";
import { useCollection } from "../lib/useCollection.ts";
import styles from "./GalleryPage.module.css";

const EAGER_IMAGES = 8;
const SKELETON_TILES = Array.from({ length: 8 }, (_, index) => index);

export function GalleryPage() {
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
  } = useCollection("gallery");
  const gridRef = useRef<HTMLUListElement>(null);

  function changePage(page: number) {
    goToPage(page);
    gridRef.current?.scrollIntoView({ block: "start" });
  }

  let content = null;
  if (waiting) {
    content = (
      <ul className={styles.grid} aria-hidden="true">
        {SKELETON_TILES.map((index) => (
          <li key={index} className={styles.skeleton}>
            <span className={styles.skeletonPhoto} />
            <span className={styles.skeletonName} />
            <span className={styles.skeletonCategory} />
          </li>
        ))}
      </ul>
    );
  } else if (!unavailable && results.total === 0) {
    content = (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>No recipes match your search</h2>
        <button
          className={styles.clear}
          type="button"
          onClick={() => setView({ ...view, query: "", categories: [], page: 1 })}
        >
          Show all recipes
        </button>
      </div>
    );
  } else if (!unavailable) {
    content = (
      <>
        <ul ref={gridRef} className={styles.grid} aria-label="Recipes">
          {results.items.map((meal, index) => (
            <li key={meal.id} className={styles.item}>
              <Link className={styles.tile} to={detailHref(meal.id)} onClick={rememberPosition}>
                <MealImage
                  src={meal.imageUrl}
                  alt=""
                  className={styles.photo}
                  loading={index < EAGER_IMAGES ? "eager" : "lazy"}
                />
                <span className={styles.name}>{meal.name}</span>
                <span className={styles.category}>{meal.category}</span>
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
      {content}
    </>
  );
}

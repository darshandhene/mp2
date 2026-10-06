import { useState } from "react";
import { useMeals } from "../context/MealsProvider.tsx";
import styles from "./CatalogStatus.module.css";

export function CatalogStatus() {
  const { status, failedCategories, error, retry } = useMeals();
  const [pending, setPending] = useState(false);

  async function onRetry() {
    setPending(true);
    try {
      await retry();
    } finally {
      setPending(false);
    }
  }

  const retryButton = (
    <button type="button" className={styles.retry} onClick={() => void onRetry()} disabled={pending}>
      {pending ? "Retrying…" : "Retry"}
    </button>
  );

  if (status === "error") {
    return (
      <div className={styles.notice} role="alert">
        <p className={styles.message}>
          Recipes could not be loaded.
          {error && <span className={styles.detail}> {error}</span>}
        </p>
        {retryButton}
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className={styles.notice} role="status">
        <p className={styles.message}>
          Some categories did not load: {failedCategories.join(", ")}. Showing the recipes that arrived.
        </p>
        {retryButton}
      </div>
    );
  }

  return null;
}

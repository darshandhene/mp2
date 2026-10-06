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

  if (status === "loading") {
    return <p className={styles.loading}>Loading meals…</p>;
  }

  if (status === "error") {
    return (
      <div className={styles.notice} role="alert">
        <p>{error ?? "The meal list could not be loaded."}</p>
        <button type="button" onClick={() => void onRetry()} disabled={pending}>
          {pending ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  if (status === "partial") {
    return (
      <div className={styles.notice} role="status">
        <p>Some categories did not load: {failedCategories.join(", ")}. Showing the meals that arrived.</p>
        <button type="button" onClick={() => void onRetry()} disabled={pending}>
          {pending ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  return null;
}

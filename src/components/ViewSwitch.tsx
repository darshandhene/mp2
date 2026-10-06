import { Link } from "react-router-dom";
import { hrefFor } from "../lib/viewState.ts";
import type { ViewState } from "../types/meal.ts";
import styles from "./ViewSwitch.module.css";

export function ViewSwitch({ view }: { view: ViewState }) {
  return (
    <nav className={styles.views} aria-label="Presentation">
      <Link
        to={hrefFor("/list", { ...view, from: "list" })}
        aria-current={view.from === "list" ? "page" : undefined}
      >
        List
      </Link>
      <Link
        to={hrefFor("/gallery", { ...view, from: "gallery" })}
        aria-current={view.from === "gallery" ? "page" : undefined}
      >
        Gallery
      </Link>
    </nav>
  );
}

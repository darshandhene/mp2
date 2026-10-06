import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <section className={styles.sheet}>
      <h1>That page is not on the menu</h1>
      <p>The address does not match a list, gallery, or recipe.</p>
      <Link to="/list">Browse recipes</Link>
    </section>
  );
}

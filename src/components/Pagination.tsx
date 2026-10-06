import styles from "./Pagination.module.css";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  return (
    <nav className={styles.pager} aria-label="Pages">
      <button className={styles.button} type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous page
      </button>
      <span className={styles.status} aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <button className={styles.button} type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        Next page
      </button>
    </nav>
  );
}

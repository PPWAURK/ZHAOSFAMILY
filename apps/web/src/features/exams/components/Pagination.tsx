import styles from "../exams.module.css";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  labels: { prev: string; next: string };
  onChange: (page: number) => void;
};

export default function Pagination({ page, pageSize, total, labels, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.button}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {labels.prev}
      </button>
      <span>
        {page} / {pageCount}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={page >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        {labels.next}
      </button>
    </div>
  );
}

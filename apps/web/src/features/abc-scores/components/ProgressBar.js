export default function ProgressBar({ label, filled, total, styles }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;

  return (
    <div className={styles.progressItem}>
      <div className={styles.progressTop}>
        <span>{label}</span>
        <span className={styles.progressCount}>
          {filled}/{total}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

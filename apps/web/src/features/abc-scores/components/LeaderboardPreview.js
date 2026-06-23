export default function LeaderboardPreview({
  open,
  t,
  styles,
  leaderboard,
  onClose,
}) {
  if (!open || !leaderboard) {
    return null;
  }

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className={styles.modalPanel} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t.previewTitle}</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label={t.closePreview}
          >
            ×
          </button>
        </div>

        <table className={styles.previewTable}>
          <thead>
            <tr>
              <th>{t.rank}</th>
              <th>{t.tableStore}</th>
              <th>{t.tableMarketing}</th>
              <th>{t.tableOperations}</th>
              <th>{t.tableTotal}</th>
              <th>{t.grade}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.entries.map((entry) => (
              <tr key={entry.restaurantId}>
                <td className={styles.previewRank}>{entry.rank}</td>
                <td>{entry.storeName}</td>
                <td>{entry.marketingScore ?? "—"}</td>
                <td>{entry.operationsScore ?? "—"}</td>
                <td className={styles.totalValue}>{entry.totalScore}</td>
                <td>
                  {entry.grade ? (
                    <span className={styles.gradeBadge}>{entry.grade}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

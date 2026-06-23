export default function ScoreEditModal({
  open,
  t,
  styles,
  department,
  draft,
  onChange,
  onSubmit,
  onClose,
  saving,
  error,
}) {
  if (!open) {
    return null;
  }

  const isOperations = department === "operations";
  const departmentLabel = isOperations ? t.tableOperations : t.tableMarketing;

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        className={styles.modalPanel}
        role="dialog"
        aria-modal="true"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{departmentLabel}</h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={saving}
            aria-label={t.cancel}
          >
            ×
          </button>
        </div>

        <label className={styles.formField}>
          <span>{t.score}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={draft.score ?? ""}
            disabled={saving}
            onChange={(event) => onChange("score", event.target.value)}
          />
        </label>

        {isOperations ? (
          <label className={styles.formField}>
            <span>{t.gradeLabel}</span>
            <select
              value={draft.grade ?? ""}
              disabled={saving}
              onChange={(event) => onChange("grade", event.target.value)}
            >
              <option value="">{t.gradeNone}</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
        ) : null}

        <label className={styles.formField}>
          <span>{t.notes}</span>
          <textarea
            value={draft.notes ?? ""}
            placeholder={t.notesPlaceholder}
            disabled={saving}
            onChange={(event) => onChange("notes", event.target.value)}
          />
        </label>

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={onClose}
            disabled={saving}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={saving}
          >
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}

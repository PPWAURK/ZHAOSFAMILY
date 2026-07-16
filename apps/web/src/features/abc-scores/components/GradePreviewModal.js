import StoreScoreTable from "@/features/abc-scores/components/StoreScoreTable";

export default function GradePreviewModal({ open, directory, t, styles, onClose }) {
  if (!open || !directory) {
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
      <section
        className={`${styles.modalPanel} ${styles.previewPanel}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{t.previewTitle}</h2>
            <p className={styles.previewSubtitle}>{directory.cycle.label}</p>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            aria-label={t.closePreview}
          >
            ×
          </button>
        </div>
        <StoreScoreTable
          stores={directory.entries}
          t={t}
          styles={styles}
          canManage={false}
          isDraft={false}
          onEdit={() => undefined}
          onUpload={() => undefined}
          uploadingFor={null}
          showReports={false}
        />
      </section>
    </div>
  );
}

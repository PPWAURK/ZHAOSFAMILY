import { useRef } from "react";

function ScoreCell({ value, t, styles, canEdit, onEdit }) {
  return (
    <td>
      {value !== null ? (
        <span className={styles.scoreValue}>{value}</span>
      ) : (
        <span className={styles.scoreEmpty}>{t.notFilled}</span>
      )}
      {canEdit ? (
        <span className={styles.cellActions}>
          <button type="button" className={styles.linkButton} onClick={onEdit}>
            {t.edit}
          </button>
        </span>
      ) : null}
    </td>
  );
}

function ReportCell({ store, t, styles, canUpload, isUploading, onUpload, resolveMediaUrl }) {
  const inputRef = useRef(null);

  return (
    <td>
      {store.media.map((item) => (
        <a
          key={item.id}
          className={styles.reportLink}
          href={resolveMediaUrl(item.objectKey)}
          target="_blank"
          rel="noreferrer"
        >
          {t.viewReport}
        </a>
      ))}
      {canUpload ? (
        <label className={styles.linkButton}>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onUpload(file);
              }
              event.target.value = "";
            }}
          />
          {isUploading ? t.uploading : t.uploadReport}
        </label>
      ) : null}
    </td>
  );
}

export default function StoreScoreTable({
  stores,
  t,
  styles,
  canMarketing,
  canOperations,
  isDraft,
  onEdit,
  onUpload,
  uploadingFor,
  resolveMediaUrl,
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t.tableStore}</th>
            <th>{t.tableMarketing}</th>
            <th>{t.tableOperations}</th>
            <th>{t.tableReport}</th>
            <th>{t.tableGrade}</th>
            <th>{t.tableTotal}</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => {
            const total =
              (store.marketingScore ?? 0) + (store.operationsScore ?? 0);

            return (
              <tr key={store.restaurantId}>
                <td>
                  <div className={styles.storeName}>{store.storeName}</div>
                  <div className={styles.storeAddress}>{store.storeAddress}</div>
                </td>
                <ScoreCell
                  value={store.marketingScore}
                  t={t}
                  styles={styles}
                  canEdit={canMarketing && isDraft}
                  onEdit={() =>
                    onEdit(store.restaurantId, "marketing", {
                      score: store.marketingScore,
                      notes: store.marketingNotes,
                    })
                  }
                />
                <ScoreCell
                  value={store.operationsScore}
                  t={t}
                  styles={styles}
                  canEdit={canOperations && isDraft}
                  onEdit={() =>
                    onEdit(store.restaurantId, "operations", {
                      score: store.operationsScore,
                      notes: store.operationsNotes,
                      grade: store.grade,
                    })
                  }
                />
                <ReportCell
                  store={store}
                  t={t}
                  styles={styles}
                  canUpload={canOperations && isDraft}
                  isUploading={uploadingFor === store.restaurantId}
                  onUpload={(file) => onUpload(store.restaurantId, file)}
                  resolveMediaUrl={resolveMediaUrl}
                />
                <td>
                  {store.grade ? (
                    <span className={styles.gradeBadge}>{store.grade}</span>
                  ) : (
                    <span className={styles.scoreEmpty}>{t.gradeNone}</span>
                  )}
                </td>
                <td>
                  <span className={styles.totalValue}>{total}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

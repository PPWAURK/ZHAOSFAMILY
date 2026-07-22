import { useRef, useState } from "react";
import { MediaLink } from "@/shared/components/media/MediaLink";

const GRADES = ["A", "B", "C"];

function getStoreInitial(storeName) {
  return storeName.trim().slice(0, 1).toUpperCase();
}

function StorePhoto({ storeName, photoUrl, styles }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!photoUrl || imageFailed) {
    return <span className={styles.storePhotoFallback}>{getStoreInitial(storeName)}</span>;
  }

  return (
    <img
      className={styles.storePhoto}
      src={photoUrl}
      alt=""
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

function ReportActions({ store, t, styles, canUpload, isUploading, onUpload }) {
  const inputRef = useRef(null);

  return (
    <div className={styles.reportActions}>
      {store.media.map((item) => (
        <MediaLink key={item.id} className={styles.reportLink} objectKey={item.objectKey}>
          {t.viewReport}
        </MediaLink>
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
    </div>
  );
}

function StoreGradeCard({
  store,
  grade,
  t,
  styles,
  canManage,
  isDraft,
  onEdit,
  onUpload,
  uploadingFor,
  showReports,
  showNotes,
}) {
  const gradeClass = styles[`gradeStoreCard${grade}`] ?? styles.gradeStoreCard;
  const gradeLabel = grade === "Ungraded" ? "—" : grade;
  const gradeAriaLabel = grade === "Ungraded" ? t.gradeNone : grade;

  return (
    <article className={`${styles.gradeStoreCard} ${gradeClass}`}>
      <div className={styles.gradeStoreTop}>
        <StorePhoto storeName={store.storeName} photoUrl={store.photoUrl} styles={styles} />
        <div className={styles.gradeStoreHeader}>
          <div>
            <h3 className={styles.storeName}>{store.storeName}</h3>
            <p className={styles.storeAddress}>{store.storeAddress}</p>
          </div>
          <span className={styles.gradeBadge} aria-label={gradeAriaLabel}>
            {gradeLabel}
          </span>
        </div>
      </div>
      {showNotes ? (
        <p className={styles.gradeStoreNotes}>{store.inspectionNotes ?? t.notFilled}</p>
      ) : null}
      {showReports || (canManage && isDraft) ? (
        <div className={styles.gradeStoreFooter}>
          {showReports ? (
            <ReportActions
              store={store}
              t={t}
              styles={styles}
              canUpload={canManage && isDraft}
              isUploading={uploadingFor === store.restaurantId}
              onUpload={(file) => onUpload(store.restaurantId, file)}
            />
          ) : null}
          {canManage && isDraft ? (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() =>
                onEdit(store.restaurantId, {
                  grade: store.grade,
                  notes: store.inspectionNotes,
                })
              }
            >
              {t.edit}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function StoreScoreTable({
  stores,
  t,
  styles,
  canManage,
  isDraft,
  onEdit,
  onUpload,
  uploadingFor,
  showReports = true,
  showNotes = true,
}) {
  const storesByGrade = new Map(
    GRADES.map((grade) => [grade, stores.filter((store) => store.grade === grade)]),
  );
  const ungradedStores = stores.filter((store) => !store.grade);

  return (
    <div className={styles.gradeBoard}>
      {GRADES.map((grade) => {
        const gradeStores = storesByGrade.get(grade) ?? [];

        return (
          <section key={grade} className={styles.gradeSection}>
            <div className={styles.gradeSectionHeading}>
              <span className={styles[`gradeMarker${grade}`]} aria-hidden="true" />
              <h2>{t.gradeGroupLabel(grade, gradeStores.length)}</h2>
            </div>
            <div className={styles.gradeStoreGrid}>
              {gradeStores.map((store) => (
                <StoreGradeCard
                  key={store.restaurantId}
                  store={store}
                  grade={grade}
                  t={t}
                  styles={styles}
                  canManage={canManage}
                  isDraft={isDraft}
                  onEdit={onEdit}
                  onUpload={onUpload}
                  uploadingFor={uploadingFor}
                  showReports={showReports}
                  showNotes={showNotes}
                />
              ))}
            </div>
          </section>
        );
      })}
      {ungradedStores.length > 0 ? (
        <section className={styles.gradeSection}>
          <div className={styles.gradeSectionHeading}>
            <span className={styles.gradeMarkerUngraded} aria-hidden="true" />
            <h2>{t.ungradedGroupLabel(ungradedStores.length)}</h2>
          </div>
          <div className={styles.gradeStoreGrid}>
            {ungradedStores.map((store) => (
              <StoreGradeCard
                key={store.restaurantId}
                store={store}
                grade="Ungraded"
                t={t}
                styles={styles}
                canManage={canManage}
                isDraft={isDraft}
                onEdit={onEdit}
                onUpload={onUpload}
                uploadingFor={uploadingFor}
                showReports={showReports}
                showNotes={showNotes}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

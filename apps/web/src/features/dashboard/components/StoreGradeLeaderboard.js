"use client";

import { motion } from "motion/react";

import { buildPublicStorePhotoUrl } from "@/shared/api/api-client";
import styles from "@/features/dashboard/components/store-grade-leaderboard.module.css";

const GRADES = ["A", "B", "C"];
const GRADE_TIERS = [...GRADES, "Ungraded"];

function getStoreInitial(storeName) {
  return storeName.trim().slice(0, 1).toUpperCase();
}

function StorePhoto({ entry }) {
  if (!entry.photoObjectKey) {
    return <span className={styles.storePhotoFallback}>{getStoreInitial(entry.storeName)}</span>;
  }

  return <img src={buildPublicStorePhotoUrl(entry.photoObjectKey)} alt="" loading="lazy" />;
}

export default function StoreGradeLeaderboard({
  copy,
  gradeCopy,
  entries,
  cycle,
  cycleIndex,
  cycleCount,
  onPrevious,
  onNext,
}) {
  const entriesByGrade = new Map(
    GRADE_TIERS.map((grade) => [
      grade,
      entries.filter((entry) =>
        grade === "Ungraded" ? entry.grade === null : entry.grade === grade,
      ),
    ]),
  );

  function handleDragEnd(_, info) {
    if (info.offset.x <= -80 && cycleIndex < cycleCount - 1) {
      onNext();
    }

    if (info.offset.x >= 80 && cycleIndex > 0) {
      onPrevious();
    }
  }

  return (
    <motion.section
      className={styles.gradeboardModule}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.gradeboardHeader}>
        <div>
          <p className={styles.gradeboardEyebrow}>{copy.kicker}</p>
          <h2 className={styles.gradeboardTitle}>{copy.title}</h2>
          <p className={styles.gradeboardSubtitle}>{copy.subtitle}</p>
        </div>

        <div className={styles.gradeboardSummary} aria-label={copy.title}>
          {GRADE_TIERS.map((grade) => (
            <div key={grade} className={styles.gradeboardSummaryItem}>
              <span className={styles[`summaryGrade${grade}`]}>
                {grade === "Ungraded" ? gradeCopy.gradeNone : grade}
              </span>
              <strong>{entriesByGrade.get(grade)?.length ?? 0}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.gradeCycleBar}>
        <div>
          <span className={styles.gradeCycleLabel}>{copy.cycleLabel}</span>
          <strong className={styles.gradeCycleName}>{cycle.label}</strong>
        </div>
        <div className={styles.gradeCycleControls}>
          <button
            type="button"
            className={styles.gradeCycleButton}
            disabled={cycleIndex === 0}
            onClick={onPrevious}
            aria-label={copy.previousCycle}
          >
            ←
          </button>
          <span className={styles.gradeCyclePosition}>
            {copy.cyclePosition(cycleIndex + 1, cycleCount)}
          </span>
          <button
            type="button"
            className={styles.gradeCycleButton}
            disabled={cycleIndex === cycleCount - 1}
            onClick={onNext}
            aria-label={copy.nextCycle}
          >
            →
          </button>
        </div>
      </div>

      <motion.div
        key={cycle.id}
        className={styles.gradeStage}
        drag={cycleCount > 1 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {GRADE_TIERS.map((grade, index) => {
          const gradeEntries = entriesByGrade.get(grade) ?? [];
          const isUngraded = grade === "Ungraded";
          const gradeLabel = isUngraded ? "—" : grade;
          const groupLabel = isUngraded
            ? gradeCopy.ungradedGroupLabel(gradeEntries.length)
            : gradeCopy.gradeGroupLabel(grade, gradeEntries.length);

          return (
            <motion.section
              key={grade}
              className={`${styles.gradeTier} ${styles[`gradeTier${grade}`]}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className={styles.gradeTierHeader}>
                <span className={styles.gradeTierBadge}>{gradeLabel}</span>
                <h3>{groupLabel}</h3>
              </header>
              <div className={styles.gradeStoreList}>
                {gradeEntries.map((entry) => (
                  <article key={entry.restaurantId} className={styles.gradeStoreCard}>
                    <figure className={styles.gradeStorePhoto}>
                      <StorePhoto entry={entry} />
                    </figure>
                    <div className={styles.gradeStoreContent}>
                      <h4>{entry.storeName}</h4>
                      <p>{entry.storeAddress}</p>
                    </div>
                    <span className={styles.gradeStoreValue}>{gradeLabel}</span>
                  </article>
                ))}
                {gradeEntries.length === 0 ? (
                  <p className={styles.emptyGrade}>{groupLabel}</p>
                ) : null}
              </div>
            </motion.section>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

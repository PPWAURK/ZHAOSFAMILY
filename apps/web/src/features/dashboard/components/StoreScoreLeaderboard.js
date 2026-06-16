"use client";

import { motion } from "motion/react";

import styles from "@/features/dashboard/components/store-score-leaderboard.module.css";

const STORE_SCORE_ENTRIES = [
  {
    id: "opera",
    name: "ZHAO Opera",
    area: "Paris 02",
    grade: "A",
    score: 96,
    trend: "+4",
    auditDate: "2026-06-10",
    focus: "出品稳定",
    imageSrc: "/store-score/store-1.jpg",
  },
  {
    id: "saint-lazare",
    name: "ZHAO Saint-Lazare",
    area: "Paris 08",
    grade: "B",
    score: 84,
    trend: "+3",
    auditDate: "2026-06-09",
    focus: "服务提速",
    imageSrc: "/store-score/store-2.jpg",
  },
  {
    id: "bastille",
    name: "ZHAO Bastille",
    area: "Paris 11",
    grade: "B",
    score: 84,
    trend: "-1",
    auditDate: "2026-06-08",
    focus: "晚高峰复盘",
    imageSrc: "/store-score/store-3.jpg",
  },
  {
    id: "republique",
    name: "ZHAO Republique",
    area: "Paris 10",
    grade: "C",
    score: 64,
    trend: "-4",
    auditDate: "2026-06-07",
    focus: "卫生复查",
    imageSrc: "/store-score/store-4.jpg",
  },
];

function getGradeCount(grade) {
  return STORE_SCORE_ENTRIES.filter((entry) => entry.grade === grade).length;
}

function getTrendClassName(trend) {
  return trend.startsWith("-") ? styles.scoreTrendDown : styles.scoreTrendUp;
}

function getRankedScoreEntries(entries) {
  const sortedEntries = [...entries].sort((left, right) => right.score - left.score);
  const scoreCounts = sortedEntries.reduce((counts, entry) => {
    counts.set(entry.score, (counts.get(entry.score) || 0) + 1);
    return counts;
  }, new Map());

  let currentRank = 0;
  let previousScore = null;

  return sortedEntries.map((entry, index) => {
    if (entry.score !== previousScore) {
      currentRank = index + 1;
      previousScore = entry.score;
    }

    return {
      ...entry,
      displayRank: currentRank,
      isTied: (scoreCounts.get(entry.score) || 0) > 1,
    };
  });
}

function getPodiumEntries(entries) {
  if (entries.length < 3) {
    return entries;
  }

  return [entries[1], entries[0], entries[2]];
}

function getPodiumTierClassName(rank) {
  if (rank === 1) {
    return styles.podiumGold;
  }
  if (rank === 2) {
    return styles.podiumSilver;
  }
  if (rank === 3) {
    return styles.podiumBronze;
  }
  return "";
}

function formatPlaceLabel(template, rank) {
  if (!template) {
    return `#${rank}`;
  }
  return template.replace("{rank}", String(rank));
}

export default function StoreScoreLeaderboard({ copy }) {
  const rankedEntries = getRankedScoreEntries(STORE_SCORE_ENTRIES);
  const podiumEntries = getPodiumEntries(rankedEntries.slice(0, 3));
  const trackingEntries = rankedEntries.slice(3);

  return (
    <motion.section
      className={styles.scoreboardModule}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.scoreboardHeader}>
        <div>
          <p className={styles.scoreboardEyebrow}>{copy.kicker}</p>
          <h2 className={styles.scoreboardTitle}>{copy.title}</h2>
          <p className={styles.scoreboardSubtitle}>{copy.subtitle}</p>
        </div>

        <div className={styles.scoreboardSummary} aria-label={copy.summaryLabel}>
          {["A", "B", "C"].map((grade) => (
            <div key={grade} className={styles.scoreboardSummaryItem}>
              <span className={styles.scoreboardSummaryGrade}>{grade}</span>
              <strong>{getGradeCount(grade)}</strong>
              <span>{copy.storeUnit}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.podiumStage} aria-label={copy.title}>
        {podiumEntries.map((entry, index) => (
          <motion.article
            key={entry.id}
            className={`${styles.podiumPlace} ${getPodiumTierClassName(
              entry.displayRank,
            )} ${styles[`podiumPlaceRank${entry.displayRank}`]}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.45,
              delay: index * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <figure className={styles.podiumPhoto}>
              <img src={entry.imageSrc} alt={`${entry.name} store`} loading="lazy" />
              <span className={styles.podiumMedal} aria-hidden="true">
                {entry.displayRank === 1 ? (
                  <svg
                    className={styles.podiumCrown}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M2 8l4.5 3.2L12 4l5.5 7.2L22 8l-2 11H4L2 8z" />
                  </svg>
                ) : null}
                <strong>{entry.displayRank}</strong>
              </span>
            </figure>

            <div className={styles.podiumContent}>
              <div className={styles.podiumPlaceRow}>
                <span className={styles.podiumPlaceLabel}>
                  {formatPlaceLabel(copy.placeLabel, entry.displayRank)}
                </span>
                {entry.isTied ? (
                  <span className={styles.tieBadge}>{copy.tieLabel}</span>
                ) : null}
                <span
                  className={`${styles.podiumGrade} ${
                    styles[`scoreGrade${entry.grade}`]
                  }`}
                >
                  {entry.grade}
                </span>
              </div>

              <div className={styles.podiumStore}>
                <p>{entry.area}</p>
                <h3>{entry.name}</h3>
              </div>

              <div className={styles.podiumScore}>
                <strong>{entry.score}</strong>
                <span className={getTrendClassName(entry.trend)}>{entry.trend}</span>
              </div>

              <p className={styles.podiumFocus}>{entry.focus}</p>
              <p className={styles.podiumAudit}>
                {copy.auditLabel} · {entry.auditDate}
              </p>
            </div>
          </motion.article>
        ))}
      </div>

      <div className={styles.scoreTrackingList} aria-label={copy.trackingLabel}>
        <div className={styles.scoreTrackingHead}>
          <span>{copy.trackingLabel}</span>
          <span>{copy.columns.grade}</span>
          <span>{copy.columns.score}</span>
          <span>{copy.columns.focus}</span>
        </div>

        <div className={styles.scoreboardRows}>
          {trackingEntries.map((entry, index) => (
            <motion.article
              key={entry.id}
              className={styles.scoreboardRow}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <img
                className={styles.scoreStorePhoto}
                src={entry.imageSrc}
                alt={`${entry.name} store`}
                loading="lazy"
              />

              <span className={styles.scoreRank}>
                {String(entry.displayRank).padStart(2, "0")}
                {entry.isTied ? (
                  <small className={styles.scoreTieLabel}>{copy.tieLabel}</small>
                ) : null}
              </span>

              <span className={styles.scoreStore}>
                <strong>{entry.name}</strong>
                <small>
                  {entry.area} · {copy.auditLabel} {entry.auditDate}
                </small>
              </span>

              <span
                className={`${styles.scoreGrade} ${styles[`scoreGrade${entry.grade}`]}`}
              >
                {entry.grade}
              </span>

              <span className={styles.scoreValue}>
                <strong>{entry.score}</strong>
                <span className={styles.scoreBar} aria-hidden="true">
                  <span style={{ width: `${entry.score}%` }} />
                </span>
              </span>

              <span className={getTrendClassName(entry.trend)}>
                {entry.trend}
              </span>

              <span className={styles.scoreFocus}>
                {entry.focus}
              </span>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

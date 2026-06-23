"use client";

import { motion } from "motion/react";

import styles from "@/features/dashboard/components/store-score-leaderboard.module.css";

// 总分为营销分 + 稽核分（0-200），进度条按一半宽度映射到 0-100 的视觉刻度。
const SCORE_BAR_DIVISOR = 2;

function getGradeCount(entries, grade) {
  return entries.filter((entry) => entry.grade === grade).length;
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

function openReport(url) {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function StoreScoreLeaderboard({ copy, entries }) {
  const rankedEntries = getRankedScoreEntries(entries);
  const podiumEntries = getPodiumEntries(rankedEntries.slice(0, 3));
  const trackingEntries = rankedEntries.slice(3);

  // 有报告时，让整张门店卡片/行可点击打开运营上传的评分报告。
  function getReportProps(entry) {
    if (!entry.reportUrl) {
      return {};
    }

    return {
      role: "button",
      tabIndex: 0,
      title: copy.reportLabel,
      "aria-label": `${entry.name} · ${copy.reportLabel}`,
      onClick: () => openReport(entry.reportUrl),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openReport(entry.reportUrl);
        }
      },
    };
  }

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
              <strong>{getGradeCount(entries, grade)}</strong>
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
            )} ${styles[`podiumPlaceRank${entry.displayRank}`]} ${
              entry.reportUrl ? styles.clickable : ""
            }`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
              duration: 0.45,
              delay: index * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
            {...getReportProps(entry)}
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
                    entry.grade ? styles[`scoreGrade${entry.grade}`] : ""
                  }`}
                >
                  {entry.grade ?? "—"}
                </span>
              </div>

              <div className={styles.podiumStore}>
                <p>{entry.area}</p>
                <h3>{entry.name}</h3>
              </div>

              <div className={styles.podiumScore}>
                <strong>{entry.score}</strong>
                {entry.trend ? (
                  <span className={getTrendClassName(entry.trend)}>
                    {entry.trend}
                  </span>
                ) : null}
              </div>

              <p className={styles.podiumFocus}>{entry.focus}</p>
              <p className={styles.podiumAudit}>
                {copy.auditLabel} · {entry.auditDate}
              </p>
              {entry.reportUrl ? (
                <span className={styles.reportTag}>{copy.reportLabel} →</span>
              ) : null}
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
              className={`${styles.scoreboardRow} ${
                entry.reportUrl ? styles.clickable : ""
              }`}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.4,
                delay: index * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
              {...getReportProps(entry)}
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
                {entry.reportUrl ? (
                  <small className={styles.reportTag}>
                    {copy.reportLabel} →
                  </small>
                ) : null}
              </span>

              <span
                className={`${styles.scoreGrade} ${
                  entry.grade ? styles[`scoreGrade${entry.grade}`] : ""
                }`}
              >
                {entry.grade ?? "—"}
              </span>

              <span className={styles.scoreValue}>
                <strong>{entry.score}</strong>
                <span className={styles.scoreBar} aria-hidden="true">
                  <span style={{ width: `${entry.score / SCORE_BAR_DIVISOR}%` }} />
                </span>
              </span>

              {entry.trend ? (
                <span className={getTrendClassName(entry.trend)}>
                  {entry.trend}
                </span>
              ) : (
                <span />
              )}

              <span className={styles.scoreFocus}>{entry.focus}</span>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

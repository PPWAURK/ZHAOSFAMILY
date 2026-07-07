"use client";

import type {
  EmployeeTrainingBadge,
  TrainingBadgeDefinition,
} from "@/types/trainingBadge";
import styles from "@/components/training-badges/training-badges.module.css";

export interface TrainingBadgeSummaryLabels {
  certified: string;
  inProgress: string;
  locked: string;
  total: string;
  completionRate: string;
  recent: string;
  next: string;
}

export interface TrainingBadgeProgressSummaryProps {
  badges: TrainingBadgeDefinition[];
  employeeBadges: EmployeeTrainingBadge[];
  getBadgeLabel: (badge: TrainingBadgeDefinition) => string;
  labels: TrainingBadgeSummaryLabels;
}

function findBadge(
  badges: readonly TrainingBadgeDefinition[],
  badgeId: string,
): TrainingBadgeDefinition | undefined {
  return badges.find((badge) => badge.id === badgeId);
}

export function TrainingBadgeProgressSummary({
  badges,
  employeeBadges,
  getBadgeLabel,
  labels,
}: TrainingBadgeProgressSummaryProps) {
  const certifiedBadges = employeeBadges.filter((badge) => badge.status === "certified");
  const inProgressBadges = employeeBadges.filter((badge) => badge.status === "in_progress");
  const lockedBadges = employeeBadges.filter((badge) => badge.status === "locked");
  const totalCompletion =
    employeeBadges.length === 0
      ? 0
      : Math.round(
          employeeBadges.reduce((sum, badge) => sum + badge.completionRate, 0) /
            employeeBadges.length,
        );
  const recentCertified = certifiedBadges.slice(-3).reverse();
  const nextBadge = [...employeeBadges]
    .filter((badge) => badge.status === "in_progress" || badge.status === "failed")
    .sort((a, b) => b.completionRate - a.completionRate)[0];

  return (
    <section className={styles.summary}>
      <div className={styles.summaryStats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{certifiedBadges.length}</span>
          <span className={styles.statLabel}>{labels.certified}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{inProgressBadges.length}</span>
          <span className={styles.statLabel}>{labels.inProgress}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{lockedBadges.length}</span>
          <span className={styles.statLabel}>{labels.locked}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{badges.length}</span>
          <span className={styles.statLabel}>{labels.total}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalCompletion}%</span>
          <span className={styles.statLabel}>{labels.completionRate}</span>
        </div>
      </div>

      <div className={styles.summaryLists}>
        <div className={styles.miniList}>
          <h3 className={styles.miniTitle}>{labels.recent}</h3>
          {recentCertified.map((employeeBadge) => {
            const badge = findBadge(badges, employeeBadge.badgeId);
            if (!badge) return null;

            return (
              <span key={employeeBadge.badgeId} className={styles.miniItem}>
                <span className={styles.miniDot} />
                {getBadgeLabel(badge)}
              </span>
            );
          })}
        </div>

        <div className={styles.miniList}>
          <h3 className={styles.miniTitle}>{labels.next}</h3>
          {nextBadge && findBadge(badges, nextBadge.badgeId) ? (
            <span className={styles.miniItem}>
              <span className={styles.miniDot} />
              {getBadgeLabel(findBadge(badges, nextBadge.badgeId)!)} · {nextBadge.completionRate}%
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

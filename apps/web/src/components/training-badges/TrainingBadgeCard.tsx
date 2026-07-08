"use client";

import type {
  EmployeeTrainingBadge,
  TrainingBadgeDefinition,
} from "@/types/trainingBadge";
import { TrainingBadgeSvg } from "@/components/training-badges/TrainingBadgeSvg";
import styles from "@/components/training-badges/training-badges.module.css";

export interface TrainingBadgeCardProps {
  badge: TrainingBadgeDefinition;
  employeeBadge: EmployeeTrainingBadge;
  label: string;
  description?: string;
  unlockHint?: string;
  statusLabel: string;
  onClick?: () => void;
}

export function TrainingBadgeCard({
  badge,
  employeeBadge,
  label,
  description,
  unlockHint,
  statusLabel,
  onClick,
}: TrainingBadgeCardProps) {
  const scoreText =
    typeof employeeBadge.score === "number" ? `${employeeBadge.score}` : undefined;
  const progressText = `${employeeBadge.progress}/${employeeBadge.maxProgress}`;

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <TrainingBadgeSvg
        track={badge.track}
        rarity={badge.rarity}
        iconType={badge.iconType}
        status={employeeBadge.status}
        progress={employeeBadge.completionRate}
        stableId={badge.id}
        imageFileName={badge.imageFileName}
      />

      <span className={styles.cardBody}>
        <span className={styles.cardTop}>
          <span className={styles.meta}>{badge.level ? `L${badge.level}` : badge.track}</span>
          <span className={styles.statusPill}>{statusLabel}</span>
        </span>

        <span className={styles.label}>{label}</span>
        {description ? <span className={styles.description}>{description}</span> : null}
        {employeeBadge.status === "locked" && unlockHint ? (
          <span className={styles.description}>{unlockHint}</span>
        ) : null}

        <span className={styles.meta}>
          {progressText}
          {scoreText ? ` · ${scoreText}` : ""}
          {employeeBadge.certifiedAt ? ` · ${employeeBadge.certifiedAt.slice(0, 10)}` : ""}
          {employeeBadge.expiresAt ? ` · ${employeeBadge.expiresAt.slice(0, 10)}` : ""}
        </span>

        <span className={styles.progressTrack} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{ width: `${employeeBadge.completionRate}%` }}
          />
        </span>
      </span>
    </button>
  );
}

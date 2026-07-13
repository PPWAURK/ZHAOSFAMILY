"use client";

import { useMemo, useState } from "react";
import type {
  BadgeStatus,
  EmployeeTrainingBadge,
  TrainingBadgeDefinition,
  TrainingTrack,
} from "@/types/trainingBadge";
import { TrainingBadgeCard } from "@/features/training/components/badges/TrainingBadgeCard";
import styles from "@/features/training/components/badges/training-badges.module.css";

export interface TrainingBadgeGalleryProps {
  badges: TrainingBadgeDefinition[];
  employeeBadges: EmployeeTrainingBadge[];
  getBadgeLabel: (badge: TrainingBadgeDefinition) => string;
  getBadgeDescription?: (badge: TrainingBadgeDefinition) => string;
  getUnlockHint?: (badge: TrainingBadgeDefinition) => string;
  getStatusLabel: (status: BadgeStatus) => string;
  getFilterLabel?: (filter: BadgeFilter) => string;
  onBadgeClick?: (badge: TrainingBadgeDefinition) => void;
}

type BadgeFilter = "all" | TrainingTrack | BadgeStatus;

const FILTERS: readonly BadgeFilter[] = [
  "all",
  "general",
  "front",
  "kitchen",
  "management",
  "safety",
  "hygiene",
  "certification",
  "certified",
  "in_progress",
  "locked",
  "failed",
  "expired",
];

const TRACK_ORDER: readonly TrainingTrack[] = [
  "general",
  "front",
  "kitchen",
  "management",
  "safety",
  "hygiene",
  "service",
  "certification",
];

const STATUS_RANK: Record<BadgeStatus, number> = {
  certified: 0,
  completed: 1,
  in_progress: 2,
  failed: 3,
  locked: 4,
  expired: 5,
};

function getEmployeeBadge(
  badgeId: string,
  employeeBadgeById: Map<string, EmployeeTrainingBadge>,
): EmployeeTrainingBadge {
  return (
    employeeBadgeById.get(badgeId) ?? {
      badgeId,
      status: "locked",
      progress: 0,
      maxProgress: 0,
      completionRate: 0,
    }
  );
}

function matchesFilter(
  filter: BadgeFilter,
  badge: TrainingBadgeDefinition,
  employeeBadge: EmployeeTrainingBadge,
): boolean {
  if (filter === "all") return true;
  if (filter === badge.track) return true;
  return filter === employeeBadge.status;
}

export function TrainingBadgeGallery({
  badges,
  employeeBadges,
  getBadgeLabel,
  getBadgeDescription,
  getUnlockHint,
  getStatusLabel,
  getFilterLabel,
  onBadgeClick,
}: TrainingBadgeGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<BadgeFilter>("all");
  const employeeBadgeById = useMemo(
    () => new Map(employeeBadges.map((employeeBadge) => [employeeBadge.badgeId, employeeBadge])),
    [employeeBadges],
  );
  const visibleBadges = useMemo(
    () =>
      badges
        .filter((badge) => matchesFilter(activeFilter, badge, getEmployeeBadge(badge.id, employeeBadgeById)))
        .sort((a, b) => {
          const aEmployeeBadge = getEmployeeBadge(a.id, employeeBadgeById);
          const bEmployeeBadge = getEmployeeBadge(b.id, employeeBadgeById);

          return STATUS_RANK[aEmployeeBadge.status] - STATUS_RANK[bEmployeeBadge.status];
        }),
    [activeFilter, badges, employeeBadgeById],
  );

  return (
    <section className={styles.gallery}>
      <div className={styles.filterBar}>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`${styles.filterButton} ${
              activeFilter === filter ? styles.filterButtonActive : ""
            }`}
            onClick={() => setActiveFilter(filter)}
          >
            {getFilterLabel ? getFilterLabel(filter) : filter}
          </button>
        ))}
      </div>

      {TRACK_ORDER.map((track) => {
        const trackBadges = visibleBadges.filter((badge) => badge.track === track);

        if (trackBadges.length === 0) return null;

        return (
          <section key={track} className={styles.group}>
            <header className={styles.groupHeader}>
              <h2 className={styles.groupTitle}>{getFilterLabel ? getFilterLabel(track) : track}</h2>
              <span className={styles.meta}>{trackBadges.length}</span>
            </header>
            <div className={styles.grid}>
              {trackBadges.map((badge) => {
                const employeeBadge = getEmployeeBadge(badge.id, employeeBadgeById);

                return (
                  <TrainingBadgeCard
                    key={badge.id}
                    badge={badge}
                    employeeBadge={employeeBadge}
                    label={getBadgeLabel(badge)}
                    description={getBadgeDescription?.(badge)}
                    unlockHint={getUnlockHint?.(badge)}
                    statusLabel={getStatusLabel(employeeBadge.status)}
                    onClick={() => onBadgeClick?.(badge)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}

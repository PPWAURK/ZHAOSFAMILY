"use client";

import { useMemo, useState } from "react";
import type {
  BadgeStatus,
  EmployeeTrainingProgressInput,
  TrainingBadgeDefinition,
} from "@/types/trainingBadge";
import { calculateAllTrainingBadges } from "@/lib/trainingBadgeRules";
import { TrainingBadgeDetailModal } from "@/features/training/components/badges/TrainingBadgeDetailModal";
import { TrainingBadgeGallery } from "@/features/training/components/badges/TrainingBadgeGallery";
import { TrainingBadgeProgressSummary } from "@/features/training/components/badges/TrainingBadgeProgressSummary";
import styles from "@/features/training/components/badges/training-badges.module.css";

export interface TrainingBadgeWallLabels {
  close: string;
  progress: string;
  score: string;
  requiredScore: string;
  requiredTraining: string;
  requiredAssessment: string;
  certifiedAt: string;
  expiresAt: string;
  level: string;
  certified: string;
  inProgress: string;
  locked: string;
  total: string;
  completionRate: string;
  recent: string;
  next: string;
}

export interface TrainingBadgeWallProps {
  badges: TrainingBadgeDefinition[];
  employeeProgress?: EmployeeTrainingProgressInput;
  employeeBadges?: ReturnType<typeof calculateAllTrainingBadges>;
  getBadgeLabel: (badge: TrainingBadgeDefinition) => string;
  getBadgeDescription?: (badge: TrainingBadgeDefinition) => string;
  getUnlockHint?: (badge: TrainingBadgeDefinition) => string;
  getStatusLabel: (status: BadgeStatus) => string;
  getFilterLabel?: (filter: string) => string;
  labels?: TrainingBadgeWallLabels;
}

const DEFAULT_LABELS: TrainingBadgeWallLabels = {
  close: "Close",
  progress: "Progress",
  score: "Score",
  requiredScore: "Required score",
  requiredTraining: "Required training",
  requiredAssessment: "Required assessment",
  certifiedAt: "Certified at",
  expiresAt: "Expires at",
  level: "Level",
  certified: "Certified",
  inProgress: "In progress",
  locked: "Locked",
  total: "Total",
  completionRate: "Completion",
  recent: "Recent",
  next: "Next",
};

export function TrainingBadgeWall({
  badges,
  employeeProgress,
  employeeBadges: employeeBadgesProp,
  getBadgeLabel,
  getBadgeDescription,
  getUnlockHint,
  getStatusLabel,
  getFilterLabel,
  labels = DEFAULT_LABELS,
}: TrainingBadgeWallProps) {
  const [selectedBadge, setSelectedBadge] = useState<TrainingBadgeDefinition | null>(null);
  const employeeBadges = useMemo(
    () =>
      employeeBadgesProp ??
      calculateAllTrainingBadges(
        badges,
        employeeProgress ?? { completedTrainingIds: [], assessmentScores: {} },
      ),
    [badges, employeeBadgesProp, employeeProgress],
  );
  const selectedEmployeeBadge = selectedBadge
    ? employeeBadges.find((badge) => badge.badgeId === selectedBadge.id) ?? null
    : null;

  return (
    <section className={styles.wall}>
      <TrainingBadgeProgressSummary
        badges={badges}
        employeeBadges={employeeBadges}
        getBadgeLabel={getBadgeLabel}
        labels={labels}
      />

      <TrainingBadgeGallery
        badges={badges}
        employeeBadges={employeeBadges}
        getBadgeLabel={getBadgeLabel}
        getBadgeDescription={getBadgeDescription}
        getUnlockHint={getUnlockHint}
        getStatusLabel={getStatusLabel}
        getFilterLabel={getFilterLabel}
        onBadgeClick={setSelectedBadge}
      />

      <TrainingBadgeDetailModal
        open={Boolean(selectedBadge)}
        badge={selectedBadge}
        employeeBadge={selectedEmployeeBadge}
        label={selectedBadge ? getBadgeLabel(selectedBadge) : ""}
        description={selectedBadge ? getBadgeDescription?.(selectedBadge) : undefined}
        unlockHint={selectedBadge ? getUnlockHint?.(selectedBadge) : undefined}
        statusLabel={selectedEmployeeBadge ? getStatusLabel(selectedEmployeeBadge.status) : ""}
        labels={labels}
        getStatusLabel={getStatusLabel}
        onClose={() => setSelectedBadge(null)}
      />
    </section>
  );
}

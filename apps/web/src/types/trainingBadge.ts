export type TrainingTrack =
  | "general"
  | "front"
  | "kitchen"
  | "management"
  | "safety"
  | "hygiene"
  | "service"
  | "certification";

export type BadgeRarity = "common" | "rare" | "epic" | "legendary";

export type BadgeStatus =
  | "locked"
  | "in_progress"
  | "completed"
  | "certified"
  | "failed"
  | "expired";

export type DisplaySize = "sm" | "md" | "lg";

export type TrainingBadgeIconType =
  | "service"
  | "kitchen"
  | "management"
  | "training"
  | "exam"
  | "certificate"
  | "shield"
  | "book"
  | "check"
  | "star"
  | "crown"
  | "laurel"
  | "flame"
  | "bowl"
  | "steam"
  | "bell"
  | "target"
  | "chart"
  | "team"
  | "clock"
  | "hygiene"
  | "safety";

export interface TrainingBadgeDefinition {
  id: string;
  track: TrainingTrack;
  rarity: BadgeRarity;
  level?: number;
  requiredTrainingIds: string[];
  requiredAssessmentIds?: string[];
  requiredScore?: number;
  requiredCompletionRate?: number;
  i18nKey: string;
  descriptionKey: string;
  unlockHintKey: string;
  iconType: TrainingBadgeIconType;
  imageFileName?: string;
}

export interface EmployeeTrainingBadge {
  badgeId: string;
  status: BadgeStatus;
  progress: number;
  maxProgress: number;
  completionRate: number;
  score?: number;
  certifiedAt?: string;
  expiresAt?: string;
}

export interface TrainingModule {
  id: string;
  track: TrainingTrack;
  level?: number;
  i18nKey: string;
  descriptionKey?: string;
}

export interface Assessment {
  id: string;
  trainingId: string;
  level?: number;
  passingScore: number;
  maxScore: number;
  i18nKey: string;
}

export interface EmployeeTrainingProgressInput {
  completedTrainingIds: string[];
  assessmentScores: Record<string, number>;
  certifiedBadgeIds?: string[];
  expiredBadgeIds?: string[];
}

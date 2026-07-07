export type TrainingMaterialType = "video" | "pdf" | "image" | "document" | string;

export type TrainingCourse = {
  id: string;
  type: string;
  req?: boolean;
  title: string;
  en?: string;
  dur?: string;
  prog?: number;
  status?: string;
  desc?: string;
  tags?: string[];
  [key: string]: unknown;
};

export type TrainingMaterial = {
  id: number | string;
  title?: string | null;
  description?: string | null;
  type?: TrainingMaterialType | null;
  positionId?: string | null;
  objectKey?: string | null;
  [key: string]: unknown;
};

export type TrainingMaterialFilters = {
  positionId?: string;
  type?: string;
  q?: string;
};

export type TrainingMediaUploadOptions = {
  folder?: string;
};

export type TrainingMediaUploadResult = {
  bucket?: string;
  objectKey?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  [key: string]: unknown;
};

export type CreateTrainingMaterialInput = Record<string, unknown>;

export type UpdateTrainingMaterialInput = Record<string, unknown>;

export type TrainingProgress = {
  materialId?: number | string;
  status?: string;
  [key: string]: unknown;
};

export type UpdateTrainingProgressInput = Record<string, unknown>;

export type TrainingPlan = Record<string, unknown>;

export type TrainingStoreProgress = Record<string, unknown>;

export type TrainingPosition = {
  code?: string;
  id?: string;
  label?: string;
  [key: string]: unknown;
};

export type CreateTrainingPositionInput = Record<string, unknown>;

export type UpdateTrainingPositionInput = Record<string, unknown>;

export type TrainingJobRolePosition = {
  jobRole: string;
  positionCode: string;
  includeDescendants: boolean;
  grantsAllPositions: boolean;
};

export type UpsertJobRolePositionInput = {
  positionCode: string;
  includeDescendants: boolean;
  grantsAllPositions: boolean;
};

export type TrainingResolvePreview = {
  jobRole: string | null;
  positionCodes: string[];
  requiredCount: number;
  optionalCount: number;
  warnings: { jobRole: string; reason: string }[];
};

export type TrainingDiagnostics = {
  unmappedJobRoles: string[];
  positionsWithoutMaterials: string[];
  orphanMaterials: string[];
  rolesResolvingToEmpty: string[];
};

export type TrainingBadgeRequirement = {
  materialId: number;
  title: string;
  positionId: string;
  type: string;
};

export type TrainingBadge = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  description: {
    zh: string | null;
    en: string | null;
    fr: string | null;
  };
  track: string;
  rarity: string;
  level: number | null;
  iconType: string;
  requiredScore: number;
  requiredCompletionRate: number;
  isActive: boolean;
  sortOrder: number;
  requirements: TrainingBadgeRequirement[];
};

export type TrainingEmployeeBadge = TrainingBadge & {
  status: "locked" | "in_progress" | "certified" | "failed";
  progress: number;
  maxProgress: number;
  completionRate: number;
  score: number | null;
  earnedAt: string | null;
};

export type TrainingMyBadges = {
  badges: TrainingEmployeeBadge[];
  earnedCount: number;
  totalCount: number;
};

export type TrainingMonthlyReportBadge = {
  code: string;
  name: {
    zh: string;
    en: string;
    fr: string;
  };
  earnedAt: string;
};

export type TrainingMonthlyReportUser = {
  userId: number;
  name: string;
  email: string;
  jobRole: string | null;
  restaurant: {
    id: number;
    name: string;
  };
  requiredTotal: number;
  requiredCompleted: number;
  completionPercent: number;
  completedThisMonth: number;
  quizAttemptCount: number;
  quizPassedCount: number;
  quizPassRate: number;
  averageBestScore: number | null;
  newBadgeCount: number;
  badges: TrainingMonthlyReportBadge[];
};

export type TrainingMonthlyReportStore = {
  restaurantId: number;
  restaurantName: string;
  employeeCount: number;
  averageCompletionPercent: number;
  completedEmployeeCount: number;
  completedThisMonth: number;
  quizAttemptCount: number;
  quizPassedCount: number;
  quizPassRate: number;
  averageBestScore: number | null;
  newBadgeCount: number;
};

export type TrainingMonthlyReport = {
  month: string;
  range: {
    from: string;
    to: string;
  };
  scope: {
    restaurantId: number;
    restaurantName: string;
  };
  summary: Omit<TrainingMonthlyReportStore, "restaurantId" | "restaurantName">;
  stores: TrainingMonthlyReportStore[];
  users: TrainingMonthlyReportUser[];
};

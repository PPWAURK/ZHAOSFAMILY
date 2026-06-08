export type TrainingMaterialProgress = {
  materialId: number;
  status: "not_started" | "in_progress" | "completed";
  progressPct: number;
  lastOpenedAt: string | null;
  completedAt: string | null;
};

export type TrainingPlanMaterial = {
  id: number;
  positionId: string;
  type: string;
  isRequired: boolean;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  bucket: string;
  objectKey: string;
  createdAt: string;
  updatedAt: string;
  progress: TrainingMaterialProgress;
};

export type TrainingPlanSummary = {
  requiredTotal: number;
  requiredCompleted: number;
  completionPercent: number;
};

export type TrainingPlan = {
  positionCodes: string[];
  required: TrainingPlanMaterial[];
  optional: TrainingPlanMaterial[];
  summary: TrainingPlanSummary;
};

export type UpdateTrainingProgressInput = {
  status?: "not_started" | "in_progress" | "completed";
  progressPct?: number;
};

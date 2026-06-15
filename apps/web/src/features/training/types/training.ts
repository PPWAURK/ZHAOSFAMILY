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

import { API_URL, apiClient } from "@/shared/api/api-client";
import type {
  CreateTrainingMaterialInput,
  CreateTrainingPositionInput,
  TrainingCourse,
  TrainingMaterial,
  TrainingMaterialFilters,
  TrainingMediaUploadOptions,
  TrainingMediaUploadResult,
  TrainingPlan,
  TrainingPosition,
  TrainingDiagnostics,
  TrainingJobRolePosition,
  TrainingProgress,
  TrainingResolvePreview,
  TrainingStoreProgress,
  UpdateTrainingMaterialInput,
  UpdateTrainingPositionInput,
  UpdateTrainingProgressInput,
  UpsertJobRolePositionInput,
} from "@/features/training/types/training";

export async function uploadTrainingMedia(
  file: File,
  options: TrainingMediaUploadOptions = {},
): Promise<TrainingMediaUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", options.folder || "training/ALL/GENERAL");

  return apiClient.upload<TrainingMediaUploadResult>("/media/upload", formData);
}

export async function fetchTrainingCourse(id: string): Promise<TrainingCourse> {
  return apiClient.get<TrainingCourse>(
    `/training/courses/${encodeURIComponent(id)}`,
  );
}

export async function createTrainingMaterial(
  input: CreateTrainingMaterialInput,
): Promise<TrainingMaterial> {
  return apiClient.post<TrainingMaterial>("/training/materials", input);
}

export async function fetchTrainingMaterials(
  filters: TrainingMaterialFilters = {},
): Promise<TrainingMaterial[]> {
  const params = new URLSearchParams();

  if (filters.positionId) params.set("positionId", filters.positionId);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);

  const query = params.toString();
  const materials = await apiClient.get<TrainingMaterial[]>(
    query ? `/training/materials?${query}` : "/training/materials",
  );

  return Array.isArray(materials) ? materials : [];
}

export async function fetchTrainingMaterial(id: string): Promise<TrainingMaterial> {
  return apiClient.get<TrainingMaterial>(
    `/training/materials/${encodeURIComponent(id)}`,
  );
}

export async function updateTrainingMaterial(
  id: string,
  input: UpdateTrainingMaterialInput,
): Promise<TrainingMaterial> {
  return apiClient.patch<TrainingMaterial>(
    `/training/materials/${encodeURIComponent(id)}`,
    input,
  );
}

export async function deleteTrainingMaterial(id: string): Promise<unknown> {
  return apiClient.delete(`/training/materials/${encodeURIComponent(id)}`);
}

export async function fetchTrainingProgress(): Promise<TrainingProgress[]> {
  const progress = await apiClient.get<TrainingProgress[]>("/training/progress");

  return Array.isArray(progress) ? progress : [];
}

export async function fetchTrainingMyPlan(): Promise<TrainingPlan> {
  return apiClient.get<TrainingPlan>("/training/my-plan");
}

export async function fetchTrainingStoreProgress(): Promise<TrainingStoreProgress> {
  return apiClient.get<TrainingStoreProgress>("/training/store-progress");
}

export async function updateTrainingProgress(
  id: string,
  input: UpdateTrainingProgressInput,
): Promise<TrainingProgress> {
  return apiClient.patch<TrainingProgress>(
    `/training/materials/${encodeURIComponent(id)}/progress`,
    input,
  );
}

export async function fetchTrainingPositions(): Promise<TrainingPosition[]> {
  const positions = await apiClient.get<TrainingPosition[]>("/training/positions");

  return Array.isArray(positions) ? positions : [];
}

export async function fetchManagedTrainingPositions(): Promise<TrainingPosition[]> {
  const positions = await apiClient.get<TrainingPosition[]>(
    "/training/positions/manage",
  );

  return Array.isArray(positions) ? positions : [];
}

export async function createTrainingPosition(
  input: CreateTrainingPositionInput,
): Promise<TrainingPosition> {
  return apiClient.post<TrainingPosition>("/training/positions", input);
}

export async function updateTrainingPosition(
  code: string,
  input: UpdateTrainingPositionInput,
): Promise<TrainingPosition> {
  return apiClient.patch<TrainingPosition>(
    `/training/positions/${encodeURIComponent(code)}`,
    input,
  );
}

export async function deleteTrainingPosition(code: string): Promise<unknown> {
  return apiClient.delete(`/training/positions/${encodeURIComponent(code)}`);
}

export async function fetchJobRolePositions(): Promise<TrainingJobRolePosition[]> {
  const rows = await apiClient.get<TrainingJobRolePosition[]>(
    "/training/job-role-positions",
  );

  return Array.isArray(rows) ? rows : [];
}

export async function upsertJobRolePosition(
  jobRole: string,
  input: UpsertJobRolePositionInput,
): Promise<TrainingJobRolePosition> {
  return apiClient.put<TrainingJobRolePosition>(
    `/training/job-role-positions/${encodeURIComponent(jobRole)}`,
    input,
  );
}

export async function deleteJobRolePosition(jobRole: string): Promise<unknown> {
  return apiClient.delete(
    `/training/job-role-positions/${encodeURIComponent(jobRole)}`,
  );
}

export async function fetchTrainingResolvePreview(
  jobRole: string,
): Promise<TrainingResolvePreview> {
  return apiClient.get<TrainingResolvePreview>(
    `/training/resolve-preview?jobRole=${encodeURIComponent(jobRole)}`,
  );
}

export async function fetchTrainingDiagnostics(): Promise<TrainingDiagnostics> {
  return apiClient.get<TrainingDiagnostics>("/training/diagnostics");
}

export function getTrainingMediaUrl(objectKey: string): string {
  return `${API_URL}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
}

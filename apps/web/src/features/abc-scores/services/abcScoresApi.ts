import { createAbcScoresApi } from "@zhao/api";
import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcGradeDirectory,
  AbcInspectionProgress,
  AbcPublicGradeBoard,
  AbcStoreInspectionItem,
  CreateAbcCycleRequest,
  ListAbcCyclesQuery,
  RecordAbcInspectionRequest,
} from "@zhao/types";

import { apiClient, buildMediaFileUrl } from "@/shared/api/api-client";

const abcScoresApi = createAbcScoresApi(apiClient);

type MediaUploadResult = {
  objectKey?: string;
};

export function fetchAbcCycles(query?: ListAbcCyclesQuery): Promise<AbcCycleSummary[]> {
  return abcScoresApi.listCycles(query);
}

export function createAbcCycle(input: CreateAbcCycleRequest): Promise<AbcCycleSummary> {
  return abcScoresApi.createCycle(input);
}

export function fetchAbcCycle(id: number | string): Promise<AbcCycleDetail> {
  return abcScoresApi.getCycle(id);
}

export function fetchAbcProgress(id: number | string): Promise<AbcInspectionProgress> {
  return abcScoresApi.getProgress(id);
}

export function fetchAbcGradeDirectory(cycleId: number | string): Promise<AbcGradeDirectory> {
  return abcScoresApi.getGradeDirectory(cycleId);
}

export function fetchPublishedAbcGradeCycles(): Promise<AbcCycleSummary[]> {
  return abcScoresApi.listPublishedGradeCycles();
}

export function fetchPublishedAbcGradeBoard(
  cycleId?: number | string,
): Promise<AbcPublicGradeBoard | null> {
  return abcScoresApi.getPublishedGradeBoard(cycleId);
}

export function recordAbcInspection(
  cycleId: number | string,
  restaurantId: number | string,
  input: RecordAbcInspectionRequest,
): Promise<AbcStoreInspectionItem> {
  return abcScoresApi.recordInspection(cycleId, restaurantId, input);
}

export function publishAbcCycle(id: number | string): Promise<AbcCycleSummary> {
  return abcScoresApi.publish(id);
}

export function deleteAbcCycle(id: number | string): Promise<{ id: number }> {
  return abcScoresApi.deleteCycle(id);
}

export async function uploadAbcReport(
  cycleId: number | string,
  restaurantId: number | string,
  file: File,
): Promise<AbcStoreInspectionItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "abc-inspections/reports");

  const uploaded = await apiClient.upload<MediaUploadResult>("/media/upload", formData);

  if (!uploaded.objectKey) {
    throw new Error("ABC_REPORT_UPLOAD_MISSING_OBJECT_KEY");
  }

  return abcScoresApi.attachMedia(cycleId, restaurantId, {
    objectKey: uploaded.objectKey,
    fileName: file.name,
  });
}

export function resolveAbcMediaUrl(objectKey: string): string {
  return buildMediaFileUrl(objectKey);
}

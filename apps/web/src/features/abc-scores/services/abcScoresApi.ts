import { createAbcScoresApi } from "@zhao/api";
import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcLeaderboard,
  AbcProgress,
  AbcStoreScoreItem,
  CreateAbcCycleRequest,
  FillAbcOperationsRequest,
  FillAbcScoreRequest,
  ListAbcCyclesQuery,
} from "@zhao/types";

import { apiClient, buildMediaFileUrl } from "@/shared/api/api-client";

const abcScoresApi = createAbcScoresApi(apiClient);

type MediaUploadResult = {
  objectKey?: string;
};

export function fetchAbcCycles(
  query?: ListAbcCyclesQuery,
): Promise<AbcCycleSummary[]> {
  return abcScoresApi.listCycles(query);
}

export function createAbcCycle(
  input: CreateAbcCycleRequest,
): Promise<AbcCycleSummary> {
  return abcScoresApi.createCycle(input);
}

export function fetchAbcCycle(id: number | string): Promise<AbcCycleDetail> {
  return abcScoresApi.getCycle(id);
}

export function fetchAbcProgress(id: number | string): Promise<AbcProgress> {
  return abcScoresApi.getProgress(id);
}

export function fetchAbcPreview(id: number | string): Promise<AbcLeaderboard> {
  return abcScoresApi.getPreview(id);
}

// 首页用：最新已发布周期的排行榜（无已发布周期时返回 null）。
export function fetchPublishedLeaderboard(): Promise<AbcLeaderboard | null> {
  return abcScoresApi.getPublished();
}

export function fillMarketingScore(
  cycleId: number | string,
  restaurantId: number | string,
  input: FillAbcScoreRequest,
): Promise<AbcStoreScoreItem> {
  return abcScoresApi.fillMarketing(cycleId, restaurantId, input);
}

export function fillOperationsScore(
  cycleId: number | string,
  restaurantId: number | string,
  input: FillAbcOperationsRequest,
): Promise<AbcStoreScoreItem> {
  return abcScoresApi.fillOperations(cycleId, restaurantId, input);
}

export function publishAbcCycle(
  id: number | string,
): Promise<AbcCycleSummary> {
  return abcScoresApi.publish(id);
}

export function deleteAbcCycle(id: number | string): Promise<{ id: number }> {
  return abcScoresApi.deleteCycle(id);
}

// Operations 上传评分报告：先把文件传到 /media/upload 拿 objectKey，
// 再把 objectKey 关联到该周期+门店（仿 stores 上传图片的流程）。
export async function uploadAbcReport(
  cycleId: number | string,
  restaurantId: number | string,
  file: File,
): Promise<AbcStoreScoreItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "abc-scores/reports");

  const uploaded = await apiClient.upload<MediaUploadResult>(
    "/media/upload",
    formData,
  );

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

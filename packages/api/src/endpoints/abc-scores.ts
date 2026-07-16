import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcGradeDirectory,
  AbcInspectionProgress,
  AbcPublicGradeBoard,
  AbcStoreInspectionItem,
  AttachAbcMediaRequest,
  CreateAbcCycleRequest,
  ListAbcCyclesQuery,
  RecordAbcInspectionRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type AbcScoresApi = {
  listCycles: (query?: ListAbcCyclesQuery) => Promise<AbcCycleSummary[]>;
  createCycle: (input: CreateAbcCycleRequest) => Promise<AbcCycleSummary>;
  getCycle: (id: number | string) => Promise<AbcCycleDetail>;
  getProgress: (id: number | string) => Promise<AbcInspectionProgress>;
  getGradeDirectory: (id: number | string) => Promise<AbcGradeDirectory>;
  listPublishedGradeCycles: () => Promise<AbcCycleSummary[]>;
  getPublishedGradeBoard: (id?: number | string) => Promise<AbcPublicGradeBoard | null>;
  recordInspection: (
    id: number | string,
    restaurantId: number | string,
    input: RecordAbcInspectionRequest,
  ) => Promise<AbcStoreInspectionItem>;
  attachMedia: (
    id: number | string,
    restaurantId: number | string,
    input: AttachAbcMediaRequest,
  ) => Promise<AbcStoreInspectionItem>;
  publish: (id: number | string) => Promise<AbcCycleSummary>;
  deleteCycle: (id: number | string) => Promise<{ id: number }>;
};

function buildCyclesPath(query?: ListAbcCyclesQuery): string {
  if (!query?.status) {
    return "/abc-scores/cycles";
  }

  return `/abc-scores/cycles?status=${encodeURIComponent(query.status)}`;
}

function storeBasePath(id: number | string, restaurantId: number | string): string {
  return `/abc-scores/cycles/${encodeURIComponent(id)}/stores/${encodeURIComponent(restaurantId)}`;
}

export function createAbcScoresApi(apiClient: ApiClient): AbcScoresApi {
  return {
    listCycles: (query) => apiClient.get<AbcCycleSummary[]>(buildCyclesPath(query)),
    createCycle: (input) => apiClient.post<AbcCycleSummary>("/abc-scores/cycles", input),
    getCycle: (id) => apiClient.get<AbcCycleDetail>(`/abc-scores/cycles/${encodeURIComponent(id)}`),
    getProgress: (id) =>
      apiClient.get<AbcInspectionProgress>(`/abc-scores/cycles/${encodeURIComponent(id)}/progress`),
    getGradeDirectory: (id) =>
      apiClient.get<AbcGradeDirectory>(`/abc-scores/cycles/${encodeURIComponent(id)}/overview`),
    listPublishedGradeCycles: () =>
      apiClient.get<AbcCycleSummary[]>("/abc-scores/published/cycles"),
    getPublishedGradeBoard: (id) =>
      apiClient.get<AbcPublicGradeBoard | null>(
        id === undefined
          ? "/abc-scores/published"
          : `/abc-scores/published/${encodeURIComponent(id)}`,
      ),
    recordInspection: (id, restaurantId, input) =>
      apiClient.patch<AbcStoreInspectionItem>(
        `${storeBasePath(id, restaurantId)}/inspection`,
        input,
      ),
    attachMedia: (id, restaurantId, input) =>
      apiClient.post<AbcStoreInspectionItem>(`${storeBasePath(id, restaurantId)}/media`, input),
    publish: (id) =>
      apiClient.post<AbcCycleSummary>(`/abc-scores/cycles/${encodeURIComponent(id)}/publish`),
    deleteCycle: (id) =>
      apiClient.delete<{ id: number }>(`/abc-scores/cycles/${encodeURIComponent(id)}`),
  };
}

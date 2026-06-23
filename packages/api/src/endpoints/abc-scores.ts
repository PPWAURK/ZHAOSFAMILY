import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcLeaderboard,
  AbcProgress,
  AbcStoreScoreItem,
  AttachAbcMediaRequest,
  CreateAbcCycleRequest,
  FillAbcOperationsRequest,
  FillAbcScoreRequest,
  ListAbcCyclesQuery,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type AbcScoresApi = {
  listCycles: (query?: ListAbcCyclesQuery) => Promise<AbcCycleSummary[]>;
  createCycle: (input: CreateAbcCycleRequest) => Promise<AbcCycleSummary>;
  getCycle: (id: number | string) => Promise<AbcCycleDetail>;
  getProgress: (id: number | string) => Promise<AbcProgress>;
  getPreview: (id: number | string) => Promise<AbcLeaderboard>;
  fillMarketing: (
    id: number | string,
    restaurantId: number | string,
    input: FillAbcScoreRequest,
  ) => Promise<AbcStoreScoreItem>;
  fillOperations: (
    id: number | string,
    restaurantId: number | string,
    input: FillAbcOperationsRequest,
  ) => Promise<AbcStoreScoreItem>;
  attachMedia: (
    id: number | string,
    restaurantId: number | string,
    input: AttachAbcMediaRequest,
  ) => Promise<AbcStoreScoreItem>;
  publish: (id: number | string) => Promise<AbcCycleSummary>;
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
      apiClient.get<AbcProgress>(`/abc-scores/cycles/${encodeURIComponent(id)}/progress`),
    getPreview: (id) =>
      apiClient.get<AbcLeaderboard>(`/abc-scores/cycles/${encodeURIComponent(id)}/preview`),
    fillMarketing: (id, restaurantId, input) =>
      apiClient.patch<AbcStoreScoreItem>(`${storeBasePath(id, restaurantId)}/marketing`, input),
    fillOperations: (id, restaurantId, input) =>
      apiClient.patch<AbcStoreScoreItem>(`${storeBasePath(id, restaurantId)}/operations`, input),
    attachMedia: (id, restaurantId, input) =>
      apiClient.post<AbcStoreScoreItem>(`${storeBasePath(id, restaurantId)}/media`, input),
    publish: (id) =>
      apiClient.post<AbcCycleSummary>(`/abc-scores/cycles/${encodeURIComponent(id)}/publish`),
  };
}

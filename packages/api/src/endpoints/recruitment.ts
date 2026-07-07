import type {
  CreateRecruitmentRequestRequest,
  ListRecruitmentRequestsQuery,
  RecruitmentRequestItem,
  UpdateRecruitmentRequestRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type RecruitmentRequestsApi = {
  list: (
    query?: ListRecruitmentRequestsQuery,
  ) => Promise<RecruitmentRequestItem[]>;
  create: (
    input: CreateRecruitmentRequestRequest,
  ) => Promise<RecruitmentRequestItem>;
  update: (
    id: number | string,
    input: UpdateRecruitmentRequestRequest,
  ) => Promise<RecruitmentRequestItem>;
  delete: (id: number | string) => Promise<{ id: number }>;
  batchDelete: (ids: number[]) => Promise<{ deletedCount: number }>;
};

function buildRecruitmentRequestsPath(
  query?: ListRecruitmentRequestsQuery,
): string {
  if (!query?.status) {
    return "/recruitment-requests";
  }

  return `/recruitment-requests?status=${encodeURIComponent(query.status)}`;
}

export function createRecruitmentRequestsApi(
  apiClient: ApiClient,
): RecruitmentRequestsApi {
  return {
    list: (query) =>
      apiClient.get<RecruitmentRequestItem[]>(
        buildRecruitmentRequestsPath(query),
      ),
    create: (input) =>
      apiClient.post<RecruitmentRequestItem>("/recruitment-requests", input),
    update: (id, input) =>
      apiClient.patch<RecruitmentRequestItem>(
        `/recruitment-requests/${encodeURIComponent(id)}`,
        input,
      ),
    delete: (id) =>
      apiClient.delete<{ id: number }>(
        `/recruitment-requests/${encodeURIComponent(id)}`,
      ),
    batchDelete: (ids) =>
      apiClient.post<{ deletedCount: number }>(
        '/recruitment-requests/batch-delete',
        { ids },
      ),
  };
}

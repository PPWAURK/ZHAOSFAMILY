import type {
  CaseShareCommentItem,
  CaseShareItem,
  CreateCaseShareCommentRequest,
  CreateCaseShareRequest,
  ListCaseShareCommentsQuery,
  ListCaseSharesQuery,
  ListMyCaseSharesQuery,
  PaginatedResponse,
  ReviewCaseShareRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type CaseSharesApi = {
  listPublic: (
    query?: ListCaseSharesQuery,
  ) => Promise<PaginatedResponse<CaseShareItem>>;
  listMine: (
    query?: ListMyCaseSharesQuery,
  ) => Promise<PaginatedResponse<CaseShareItem>>;
  getDetail: (id: number | string) => Promise<CaseShareItem>;
  create: (input: CreateCaseShareRequest) => Promise<CaseShareItem>;
  remove: (id: number | string) => Promise<{ id: number }>;
  listPending: (
    query?: ListCaseSharesQuery,
  ) => Promise<PaginatedResponse<CaseShareItem>>;
  review: (
    id: number | string,
    input: ReviewCaseShareRequest,
  ) => Promise<CaseShareItem>;
  listComments: (
    id: number | string,
    query?: ListCaseShareCommentsQuery,
  ) => Promise<PaginatedResponse<CaseShareCommentItem>>;
  createComment: (
    id: number | string,
    input: CreateCaseShareCommentRequest,
  ) => Promise<CaseShareCommentItem>;
  like: (id: number | string) => Promise<CaseShareItem>;
  unlike: (id: number | string) => Promise<CaseShareItem>;
};

function buildPaginationQuery(
  query?: { page?: number; pageSize?: number; status?: string },
): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  if (query.status) {
    params.set("status", query.status);
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export function createCaseSharesApi(apiClient: ApiClient): CaseSharesApi {
  return {
    listPublic: (query) =>
      apiClient.get<PaginatedResponse<CaseShareItem>>(
        `/case-shares${buildPaginationQuery(query)}`,
      ),
    listMine: (query) =>
      apiClient.get<PaginatedResponse<CaseShareItem>>(
        `/case-shares/mine${buildPaginationQuery(query)}`,
      ),
    getDetail: (id) =>
      apiClient.get<CaseShareItem>(`/case-shares/${encodeURIComponent(id)}`),
    create: (input) => apiClient.post<CaseShareItem>("/case-shares", input),
    remove: (id) =>
      apiClient.delete<{ id: number }>(`/case-shares/${encodeURIComponent(id)}`),
    listPending: (query) =>
      apiClient.get<PaginatedResponse<CaseShareItem>>(
        `/case-shares/review/pending${buildPaginationQuery(query)}`,
      ),
    review: (id, input) =>
      apiClient.patch<CaseShareItem>(
        `/case-shares/${encodeURIComponent(id)}/review`,
        input,
      ),
    listComments: (id, query) =>
      apiClient.get<PaginatedResponse<CaseShareCommentItem>>(
        `/case-shares/${encodeURIComponent(id)}/comments${buildPaginationQuery(query)}`,
      ),
    createComment: (id, input) =>
      apiClient.post<CaseShareCommentItem>(
        `/case-shares/${encodeURIComponent(id)}/comments`,
        input,
      ),
    like: (id) =>
      apiClient.post<CaseShareItem>(
        `/case-shares/${encodeURIComponent(id)}/like`,
      ),
    unlike: (id) =>
      apiClient.delete<CaseShareItem>(
        `/case-shares/${encodeURIComponent(id)}/like`,
      ),
  };
}

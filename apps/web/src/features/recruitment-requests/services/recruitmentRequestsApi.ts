import { createRecruitmentRequestsApi } from "@zhao/api";
import type {
  CreateRecruitmentRequestRequest,
  ListRecruitmentRequestsQuery,
  RecruitmentRequestItem,
  UpdateRecruitmentRequestRequest,
} from "@zhao/types";
import { apiClient } from "@/shared/api/api-client";

const recruitmentRequestsApi = createRecruitmentRequestsApi(apiClient);

export async function fetchRecruitmentRequests(
  query?: ListRecruitmentRequestsQuery,
): Promise<RecruitmentRequestItem[]> {
  const requests = await recruitmentRequestsApi.list(query);

  return Array.isArray(requests) ? requests : [];
}

export function createRecruitmentRequest(
  input: CreateRecruitmentRequestRequest,
): Promise<RecruitmentRequestItem> {
  return recruitmentRequestsApi.create(input);
}

export function updateRecruitmentRequest(
  id: number | string,
  input: UpdateRecruitmentRequestRequest,
): Promise<RecruitmentRequestItem> {
  return recruitmentRequestsApi.update(id, input);
}

export function deleteRecruitmentRequest(
  id: number | string,
): Promise<{ id: number }> {
  return recruitmentRequestsApi.delete(id);
}

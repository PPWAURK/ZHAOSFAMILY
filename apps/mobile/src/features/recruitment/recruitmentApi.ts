import { createRecruitmentRequestsApi } from "@zhao/api";
import type {
  CreateRecruitmentRequestRequest,
  RecruitmentRequestItem,
} from "@zhao/types";
import { mobileApiClient } from "@/lib/api";

const recruitmentRequestsApi = createRecruitmentRequestsApi(mobileApiClient);

export async function fetchRecruitmentRequests(): Promise<RecruitmentRequestItem[]> {
  const requests = await recruitmentRequestsApi.list();

  return Array.isArray(requests) ? requests : [];
}

export function createRecruitmentRequest(
  input: CreateRecruitmentRequestRequest,
): Promise<RecruitmentRequestItem> {
  return recruitmentRequestsApi.create(input);
}

export function deleteRecruitmentRequest(
  id: number | string,
): Promise<{ id: number }> {
  return recruitmentRequestsApi.delete(id);
}

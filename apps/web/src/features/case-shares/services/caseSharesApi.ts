import { createCaseSharesApi } from "@zhao/api";
import type { CaseShareItem, ReviewCaseShareRequest } from "@zhao/types";
import { apiClient, buildMediaFileUrl } from "@/shared/api/api-client";

const caseSharesApi = createCaseSharesApi(apiClient);

export async function fetchPendingCaseShares(): Promise<CaseShareItem[]> {
  const result = await caseSharesApi.listPending();

  return Array.isArray(result?.items) ? result.items : [];
}

export function reviewCaseShare(
  id: number | string,
  input: ReviewCaseShareRequest,
): Promise<CaseShareItem> {
  return caseSharesApi.review(id, input);
}

export function buildCaseImageUrl(objectKey: string): string {
  return buildMediaFileUrl(objectKey);
}

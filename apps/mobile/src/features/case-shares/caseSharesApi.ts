import { createCaseSharesApi, getAccessToken } from "@zhao/api";
import type {
  CaseShareCommentItem,
  CaseShareAuthorProfile,
  CaseShareItem,
  CreateCaseShareRequest,
  PaginatedResponse,
} from "@zhao/types";
import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";

const caseSharesApi = createCaseSharesApi(mobileApiClient);

export type UploadedCaseImage = {
  bucket: string;
  objectKey: string;
  mimeType: string;
  size: number;
  originalName: string;
};

export type CaseImageUpload = {
  uri: string;
  name: string;
  type: string;
};

export function fetchPublicCaseShares(): Promise<
  PaginatedResponse<CaseShareItem>
> {
  return caseSharesApi.listPublic();
}

export function fetchMyCaseShares(): Promise<PaginatedResponse<CaseShareItem>> {
  return caseSharesApi.listMine();
}

export function fetchCaseShareAuthorProfile(
  authorId: number,
): Promise<CaseShareAuthorProfile> {
  return caseSharesApi.getAuthorProfile(authorId);
}

export function createCaseShare(
  input: CreateCaseShareRequest,
): Promise<CaseShareItem> {
  return caseSharesApi.create(input);
}

export function deleteCaseShare(id: number): Promise<{ id: number }> {
  return caseSharesApi.remove(id);
}

export function likeCaseShare(id: number): Promise<CaseShareItem> {
  return caseSharesApi.like(id);
}

export function unlikeCaseShare(id: number): Promise<CaseShareItem> {
  return caseSharesApi.unlike(id);
}

export async function fetchCaseComments(
  id: number,
): Promise<CaseShareCommentItem[]> {
  const result = await caseSharesApi.listComments(id);

  return Array.isArray(result?.items) ? result.items : [];
}

export function createCaseComment(
  id: number,
  content: string,
): Promise<CaseShareCommentItem> {
  return caseSharesApi.createComment(id, { content });
}

// 先把图片传到对象存储（folder=case-shares），再用返回的 objectKey 发布案例。
export function uploadCaseImage(
  file: CaseImageUpload,
): Promise<UploadedCaseImage> {
  const formData = new FormData();
  formData.append("folder", "case-shares");
  formData.append("file", file as unknown as Blob);

  return mobileApiClient.upload<UploadedCaseImage>("/media/upload", formData);
}

export function buildCaseImageUrl(objectKey: string): string {
  const url = `${MOBILE_API_URL}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
  const token = getAccessToken();
  return token ? `${url}&token=${encodeURIComponent(token)}` : url;
}

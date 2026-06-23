import type { CaseShareStatus, CaseShareType } from "./models";

export type CreateCaseShareRequest = {
  type: CaseShareType;
  content: string;
  imageBucket?: string;
  imageObjectKey?: string;
  imageName?: string;
  imageMimeType?: string;
  imageSizeBytes?: number;
};

export type ReviewCaseShareRequest = {
  status: Exclude<CaseShareStatus, "pending">;
  reviewNote?: string;
};

export type ListCaseSharesQuery = {
  page?: number;
  pageSize?: number;
};

export type ListMyCaseSharesQuery = {
  page?: number;
  pageSize?: number;
  status?: CaseShareStatus;
};

export type ListCaseShareCommentsQuery = {
  page?: number;
  pageSize?: number;
};

export type CreateCaseShareCommentRequest = {
  content: string;
};

export const CASE_SHARE_TYPES = ["personal", "team"] as const;

export const CASE_SHARE_STATUSES = ["pending", "approved", "rejected"] as const;

export type CaseShareType = (typeof CASE_SHARE_TYPES)[number];

export type CaseShareStatus = (typeof CASE_SHARE_STATUSES)[number];

export type CaseShareAuthor = {
  id: number;
  name: string;
  email: string;
};

export type CaseShareRestaurant = {
  id: number;
  name: string;
};

export type CaseShareImage = {
  bucket: string;
  objectKey: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export type CaseShareItem = {
  id: number;
  type: CaseShareType;
  content: string;
  status: CaseShareStatus;
  author: CaseShareAuthor;
  restaurant: CaseShareRestaurant;
  image: CaseShareImage | null;
  // 仅作者本人 / 审核人可见审核备注，公开流中为 null。
  reviewNote: string | null;
  canDelete: boolean;
  canReview: boolean;
  likeCount: number;
  commentCount: number;
  likedByCurrentUser: boolean;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseShareCommentItem = {
  id: number;
  content: string;
  author: CaseShareAuthor;
  createdAt: string;
};

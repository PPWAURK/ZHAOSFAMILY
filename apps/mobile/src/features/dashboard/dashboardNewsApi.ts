import { getAccessToken } from "@zhao/api";
import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";

export type DashboardNewsAttachment = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  objectKey: string;
  href: string;
};

export type DashboardNewsReadConfirmation = {
  isRequired: boolean;
  confirmedAt: string | null;
};

export type DashboardNewsPost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  visibility: string;
  tags: string[];
  attachment: DashboardNewsAttachment | null;
  canDelete: boolean;
  readConfirmation: DashboardNewsReadConfirmation | null;
  readSummary: {
    totalRecipients: number;
    readCount: number;
    unreadCount: number;
    readRate: number;
  } | null;
  authorName: string;
  restaurantName: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardNewsReadStatus = {
  isTracked: boolean;
  summary: DashboardNewsPost["readSummary"];
  read: DashboardNewsReadStatusItem[];
  unread: DashboardNewsReadStatusItem[];
};

type DashboardNewsReadStatusItem = {
  userId: string;
  name: string;
  restaurantName: string;
  confirmedAt: string | null;
};

type DashboardNewsPostApiRecord = {
  id?: string | number;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  visibility?: string | null;
  tags?: string[] | null;
  attachment?: {
    name?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | string | null;
    bucket?: string | null;
    objectKey?: string | null;
  } | null;
  canDelete?: boolean | null;
  readConfirmation?: {
    isRequired?: boolean | null;
    confirmedAt?: string | null;
  } | null;
  readSummary?: {
    totalRecipients?: number | null;
    readCount?: number | null;
    unreadCount?: number | null;
    readRate?: number | null;
  } | null;
  restaurantName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  author?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

function getApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return MOBILE_API_URL.replace(/\/api\/?$/, "");
  }
}

function getMediaToken(): string {
  const token = getAccessToken();
  return token ? `&token=${encodeURIComponent(token)}` : "";
}

function getDashboardNewsAttachmentUrl(objectKey: string): string {
  return `${getApiOrigin()}/api/media/file?objectKey=${encodeURIComponent(objectKey)}${getMediaToken()}`;
}

function normalizeDashboardNewsBody(body: string): string {
  return body.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/media\/file\?objectKey=([^"'\s<>]+)/g,
    (_match, key: string) => `${getApiOrigin()}/api/media/file?objectKey=${key}${getMediaToken()}`,
  );
}

function normalizeDashboardNewsVisibility(visibility?: string | null): string {
  if (visibility === "private") return "management";
  if (visibility === "team") return "public";

  return visibility ?? "public";
}

function normalizeNewsPost(raw: DashboardNewsPostApiRecord): DashboardNewsPost {
  const attachmentObjectKey = raw.attachment?.objectKey ?? "";

  return {
    id: String(raw.id ?? ""),
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    body: normalizeDashboardNewsBody(raw.body ?? ""),
    category: raw.category ?? "operations",
    visibility: normalizeDashboardNewsVisibility(raw.visibility),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag) => typeof tag === "string") : [],
    attachment: raw.attachment
      ? {
          name: raw.attachment.name ?? "",
          mimeType: raw.attachment.mimeType ?? "",
          sizeBytes: Number(raw.attachment.sizeBytes) || 0,
          bucket: raw.attachment.bucket ?? "",
          objectKey: attachmentObjectKey,
          href: attachmentObjectKey ? getDashboardNewsAttachmentUrl(attachmentObjectKey) : "",
        }
      : null,
    canDelete: !!raw.canDelete,
    readConfirmation: raw.readConfirmation
      ? {
          isRequired: !!raw.readConfirmation.isRequired,
          confirmedAt: raw.readConfirmation.confirmedAt ?? null,
        }
      : null,
    readSummary: raw.readSummary
      ? {
          totalRecipients: Number(raw.readSummary.totalRecipients) || 0,
          readCount: Number(raw.readSummary.readCount) || 0,
          unreadCount: Number(raw.readSummary.unreadCount) || 0,
          readRate: Number(raw.readSummary.readRate) || 0,
        }
      : null,
    authorName: raw.author?.name ?? raw.author?.email ?? "",
    restaurantName: raw.restaurantName ?? "",
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

export async function fetchDashboardNewsPosts(): Promise<DashboardNewsPost[]> {
  const posts = await mobileApiClient.get<DashboardNewsPostApiRecord[]>("/dashboard-news");

  return Array.isArray(posts)
    ? posts.map(normalizeNewsPost).filter((post) => post.id && post.title)
    : [];
}

export async function fetchDashboardNewsPost(id: string): Promise<DashboardNewsPost | null> {
  const post = await mobileApiClient.get<DashboardNewsPostApiRecord>(
    `/dashboard-news/${encodeURIComponent(id)}`,
  );

  return post ? normalizeNewsPost(post) : null;
}

export async function confirmDashboardNewsRead(id: string): Promise<DashboardNewsReadConfirmation> {
  return mobileApiClient.post<DashboardNewsReadConfirmation>(
    `/dashboard-news/${encodeURIComponent(id)}/read-confirmation`,
  );
}

export async function fetchDashboardNewsReadStatus(id: string): Promise<DashboardNewsReadStatus> {
  const raw = await mobileApiClient.get<{
    isTracked?: boolean | null;
    summary?: DashboardNewsPost["readSummary"];
    read?: Array<{
      userId?: number | string | null;
      name?: string | null;
      restaurantName?: string | null;
      confirmedAt?: string | null;
    }>;
    unread?: Array<{
      userId?: number | string | null;
      name?: string | null;
      restaurantName?: string | null;
      confirmedAt?: string | null;
    }>;
  }>(`/dashboard-news/${encodeURIComponent(id)}/read-status`);
  const normalizeItems = (items: typeof raw.read): DashboardNewsReadStatusItem[] =>
    (Array.isArray(items) ? items : []).map((item) => ({
      userId: String(item.userId ?? ""),
      name: item.name ?? "",
      restaurantName: item.restaurantName ?? "",
      confirmedAt: item.confirmedAt ?? null,
    }));

  return {
    isTracked: !!raw.isTracked,
    summary: raw.summary
      ? {
          totalRecipients: Number(raw.summary.totalRecipients) || 0,
          readCount: Number(raw.summary.readCount) || 0,
          unreadCount: Number(raw.summary.unreadCount) || 0,
          readRate: Number(raw.summary.readRate) || 0,
        }
      : null,
    read: normalizeItems(raw.read),
    unread: normalizeItems(raw.unread),
  };
}

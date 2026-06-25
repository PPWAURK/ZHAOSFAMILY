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
  authorName: string;
  restaurantName: string;
  createdAt: string;
  updatedAt: string;
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

function getDashboardNewsAttachmentUrl(objectKey: string): string {
  return `${getApiOrigin()}/api/media/file?objectKey=${encodeURIComponent(objectKey)}`;
}

function normalizeDashboardNewsBody(body: string): string {
  return body.replace(
    /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/api\/media\/file\?objectKey=/g,
    `${getApiOrigin()}/api/media/file?objectKey=`,
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
          href: attachmentObjectKey
            ? getDashboardNewsAttachmentUrl(attachmentObjectKey)
            : "",
        }
      : null,
    canDelete: !!raw.canDelete,
    authorName: raw.author?.name ?? raw.author?.email ?? "",
    restaurantName: raw.restaurantName ?? "",
    createdAt: raw.createdAt ?? "",
    updatedAt: raw.updatedAt ?? "",
  };
}

export async function fetchDashboardNewsPosts(): Promise<DashboardNewsPost[]> {
  const posts = await mobileApiClient.get<DashboardNewsPostApiRecord[]>(
    "/dashboard-news",
  );

  return Array.isArray(posts)
    ? posts.map(normalizeNewsPost).filter((post) => post.id && post.title)
    : [];
}

export async function fetchDashboardNewsPost(
  id: string,
): Promise<DashboardNewsPost | null> {
  const post = await mobileApiClient.get<DashboardNewsPostApiRecord>(
    `/dashboard-news/${encodeURIComponent(id)}`,
  );

  return post ? normalizeNewsPost(post) : null;
}

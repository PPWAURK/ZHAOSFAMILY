import { apiClient, buildMediaFileUrl } from "@/shared/api/api-client";
import { isDefined } from "@/shared/utils/typeGuards";
import type {
  CreateDashboardNewsPostInput,
  DashboardNewsFilters,
  DashboardNewsPost,
  DashboardNewsPostApiRecord,
  UploadedDashboardNewsAttachment,
} from "@/features/dashboard/types/dashboardNews";

function normalizeVisibility(visibility?: string | null): string {
  if (visibility === "private") return "management";
  if (visibility === "team") return "public";

  return visibility ?? "public";
}

function normalizePost(
  raw: DashboardNewsPostApiRecord | null,
): DashboardNewsPost | null {
  if (!raw) return null;

  return {
    id: String(raw.id),
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    body: raw.body ?? "",
    category: raw.category ?? "operations",
    visibility: normalizeVisibility(raw.visibility),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    attachment: raw.attachment
      ? {
          name: raw.attachment.name ?? "",
          mimeType: raw.attachment.mimeType ?? "",
          sizeBytes: Number(raw.attachment.sizeBytes) || 0,
          bucket: raw.attachment.bucket ?? "",
          objectKey: raw.attachment.objectKey ?? "",
          href: getDashboardNewsAttachmentUrl(raw.attachment.objectKey ?? ""),
        }
      : null,
    restaurantId: raw.restaurantId,
    restaurantName: raw.restaurantName ?? "",
    author: {
      id: raw.author?.id,
      name: raw.author?.name ?? raw.author?.email ?? "",
      email: raw.author?.email ?? "",
    },
    canDelete: !!raw.canDelete,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function fetchDashboardNewsPosts(
  filters: DashboardNewsFilters = {},
): Promise<DashboardNewsPost[]> {
  const params = new URLSearchParams();

  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }

  if (filters.visibility && filters.visibility !== "all") {
    params.set("visibility", filters.visibility);
  }

  if (filters.q) {
    params.set("q", filters.q);
  }

  const query = params.toString();
  const posts = await apiClient.get<DashboardNewsPostApiRecord[]>(
    query ? `/dashboard-news?${query}` : "/dashboard-news",
  );

  return Array.isArray(posts) ? posts.map(normalizePost).filter(isDefined) : [];
}

export async function fetchDashboardNewsPost(
  id: string,
): Promise<DashboardNewsPost | null> {
  return normalizePost(
    await apiClient.get<DashboardNewsPostApiRecord>(
      `/dashboard-news/${encodeURIComponent(id)}`,
    ),
  );
}

export async function createDashboardNewsPost(
  input: CreateDashboardNewsPostInput,
): Promise<DashboardNewsPost | null> {
  return normalizePost(
    await apiClient.post<DashboardNewsPostApiRecord>("/dashboard-news", {
      title: input.title,
      summary: input.summary,
      body: input.body,
      category: input.category,
      visibility: input.visibility,
      tags: input.tags,
      attachmentName: input.attachment?.name,
      attachmentMimeType: input.attachment?.mimeType,
      attachmentSizeBytes: input.attachment?.sizeBytes,
      attachmentBucket: input.attachment?.bucket,
      attachmentObjectKey: input.attachment?.objectKey,
    }),
  );
}

export async function uploadDashboardNewsAttachment(
  file: File,
): Promise<UploadedDashboardNewsAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "dashboard-news");

  const uploaded = await apiClient.upload<{
    originalName?: string;
    mimeType?: string;
    size?: number;
    bucket?: string;
    objectKey?: string;
  }>("/media/upload", formData);

  return {
    name: uploaded.originalName ?? "",
    mimeType: uploaded.mimeType ?? "",
    sizeBytes: uploaded.size ?? 0,
    bucket: uploaded.bucket ?? "",
    objectKey: uploaded.objectKey ?? "",
  };
}

export async function deleteDashboardNewsPost(id: string): Promise<void> {
  await apiClient.delete(`/dashboard-news/${encodeURIComponent(id)}`);
}

export function getDashboardNewsAttachmentUrl(objectKey: string): string {
  return buildMediaFileUrl(objectKey);
}

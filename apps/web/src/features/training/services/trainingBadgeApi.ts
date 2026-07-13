import { apiClient } from "@/shared/api/api-client";

/**
 * Training badge admin API. All calls go through the shared api-client so the
 * Bearer token and the 401 → /auth/refresh retry are applied consistently
 * (see FRONTEND_STANDARDS.md — no raw fetch/axios in feature code).
 */

export async function fetchBadgeSvgFiles(): Promise<string[]> {
  return apiClient.get<string[]>("/training/badges/svg-files");
}

export async function updateBadgeImage(
  badgeCode: string,
  imageFileName: string,
): Promise<void> {
  await apiClient.patch(
    `/training/badges/${encodeURIComponent(badgeCode)}/image`,
    { imageFileName },
  );
}

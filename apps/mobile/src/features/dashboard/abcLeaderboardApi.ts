import { createAbcScoresApi } from "@zhao/api";
import type { AbcGrade, AbcLeaderboard } from "@zhao/types";

import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";

const abcScoresApi = createAbcScoresApi(mobileApiClient);

export type StoreScoreGrade = AbcGrade;

export type StoreScoreEntry = {
  id: string;
  name: string;
  area: string;
  grade: StoreScoreGrade | null;
  score: number;
  trend: string;
  auditDate: string;
  focus: string;
  photoUri: string | null;
};

function resolveApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return "";
  }
}

// 门店照片字段沿用 restaurants.photoUrl：可能是完整 URL、以 / 开头的路径，或裸 objectKey。
function resolvePhotoUri(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  if (/^(https?:)?\/\//i.test(photoUrl) || photoUrl.startsWith("data:")) {
    return photoUrl;
  }

  const apiOrigin = resolveApiOrigin();
  if (!apiOrigin) return photoUrl;
  if (photoUrl.startsWith("/")) return `${apiOrigin}${photoUrl}`;

  return `${apiOrigin}/${photoUrl.replace(/^\/+/, "")}`;
}

// 0 或 null 视为无变化，不显示趋势；正数补 "+"（与网页端口径一致）。
function formatTrend(trend: number | null): string {
  if (!trend) return "";

  return trend > 0 ? `+${trend}` : String(trend);
}

function mapEntries(board: AbcLeaderboard): StoreScoreEntry[] {
  const publishedDate = board.cycle.publishedAt
    ? board.cycle.publishedAt.slice(0, 10)
    : "";

  return board.entries.map((entry) => ({
    id: String(entry.restaurantId),
    name: entry.storeName,
    area: entry.storeAddress,
    grade: entry.grade,
    score: entry.totalScore,
    trend: formatTrend(entry.trend),
    auditDate: entry.auditDate ? entry.auditDate.slice(0, 10) : publishedDate,
    focus: entry.focus ?? "",
    photoUri: resolvePhotoUri(entry.photoUrl),
  }));
}

// 首页排行榜：最新已发布周期。无已发布周期时返回 null（首页据此显示空态）。
export async function fetchPublishedLeaderboard(): Promise<
  StoreScoreEntry[] | null
> {
  const board = await abcScoresApi.getPublished();

  return board ? mapEntries(board) : null;
}

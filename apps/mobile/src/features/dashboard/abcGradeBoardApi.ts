import { createAbcScoresApi } from "@zhao/api";
import type { AbcCycleSummary, AbcGrade, AbcPublicGradeBoard } from "@zhao/types";

import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";

const abcScoresApi = createAbcScoresApi(mobileApiClient);

export type StoreGradeEntry = {
  id: string;
  name: string;
  address: string;
  grade: AbcGrade;
  photoUri: string | null;
};

export type PublishedGradeBoard = {
  cycle: AbcCycleSummary;
  entries: StoreGradeEntry[];
};

function resolveApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return "";
  }
}

function resolvePhotoUri(photoUrl: string | null): string | null {
  if (!photoUrl) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(photoUrl) || photoUrl.startsWith("data:")) {
    return photoUrl;
  }

  const apiOrigin = resolveApiOrigin();

  if (!apiOrigin) {
    return photoUrl;
  }

  if (photoUrl.startsWith("/")) {
    return `${apiOrigin}${photoUrl}`;
  }

  return `${apiOrigin}/${photoUrl.replace(/^\/+/, "")}`;
}

function mapBoard(board: AbcPublicGradeBoard): PublishedGradeBoard {
  return {
    cycle: board.cycle,
    entries: board.entries.map((entry) => ({
      id: String(entry.restaurantId),
      name: entry.storeName,
      address: entry.storeAddress,
      grade: entry.grade,
      photoUri: resolvePhotoUri(entry.photoUrl),
    })),
  };
}

export function fetchPublishedGradeCycles(): Promise<AbcCycleSummary[]> {
  return abcScoresApi.listPublishedGradeCycles();
}

export async function fetchPublishedGradeBoard(
  cycleId?: number | string,
): Promise<PublishedGradeBoard | null> {
  const board = await abcScoresApi.getPublishedGradeBoard(cycleId);

  return board ? mapBoard(board) : null;
}

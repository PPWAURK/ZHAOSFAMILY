import { createAbcScoresApi } from "@zhao/api";
import type { AbcCycleSummary, AbcGrade, AbcPublicGradeBoard } from "@zhao/types";

import { mobileApiClient } from "@/lib/api";
import { buildPublicStorePhotoUrl } from "@/lib/media";

const abcScoresApi = createAbcScoresApi(mobileApiClient);

export type StoreGradeEntry = {
  id: string;
  name: string;
  address: string;
  grade: AbcGrade | null;
  inspectionNotes: string | null;
  photoUri: string | null;
};

export type PublishedGradeBoard = {
  cycle: AbcCycleSummary;
  entries: StoreGradeEntry[];
};

function resolvePhotoUri(photoObjectKey: string | null): string | null {
  return photoObjectKey ? buildPublicStorePhotoUrl(photoObjectKey) : null;
}

function mapBoard(board: AbcPublicGradeBoard): PublishedGradeBoard {
  return {
    cycle: board.cycle,
    entries: board.entries.map((entry) => ({
      id: String(entry.restaurantId),
      name: entry.storeName,
      address: entry.storeAddress,
      grade: entry.grade,
      inspectionNotes: entry.inspectionNotes,
      photoUri: resolvePhotoUri(entry.photoObjectKey),
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

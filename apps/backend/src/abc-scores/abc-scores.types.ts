export type AbcCycleStatus = 'draft' | 'published';

export type AbcGrade = 'A' | 'B' | 'C';

export const ABC_GRADES: readonly AbcGrade[] = ['A', 'B', 'C'];

export type AbcScoreActor = {
  id: number;
  permissions: string[];
};

export type AbcCycleSummary = {
  id: number;
  label: string;
  status: AbcCycleStatus;
  publishedAt: string | null;
  createdAt: string;
};

export type AbcInspectionMediaItem = {
  id: number;
  objectKey: string;
  fileName: string | null;
  createdAt: string;
};

export type AbcStoreInspectionItem = {
  restaurantId: number;
  storeName: string;
  storeAddress: string;
  photoUrl: string | null;
  grade: AbcGrade | null;
  inspectionNotes: string | null;
  inspectedAt: string | null;
  media: AbcInspectionMediaItem[];
};

export type AbcInspectionProgress = {
  filled: number;
  total: number;
};

export type AbcCycleDetail = AbcCycleSummary & {
  stores: AbcStoreInspectionItem[];
  progress: AbcInspectionProgress;
};

export type AbcGradeDirectoryEntry = {
  restaurantId: number;
  storeName: string;
  storeAddress: string;
  photoUrl: string | null;
  grade: AbcGrade | null;
  inspectionNotes: string | null;
  inspectedAt: string | null;
};

export type AbcGradeDirectory = {
  cycle: AbcCycleSummary;
  entries: AbcGradeDirectoryEntry[];
};

export type AbcPublicGradeEntry = Pick<
  AbcGradeDirectoryEntry,
  'restaurantId' | 'storeName' | 'storeAddress' | 'photoUrl'
> & {
  grade: AbcGrade;
};

export type AbcPublicGradeBoard = {
  cycle: AbcCycleSummary;
  entries: AbcPublicGradeEntry[];
};

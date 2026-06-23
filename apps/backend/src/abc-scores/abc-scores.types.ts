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

export type AbcScoreMediaItem = {
  id: number;
  objectKey: string;
  fileName: string | null;
  department: string;
  createdAt: string;
};

export type AbcStoreScoreItem = {
  restaurantId: number;
  storeName: string;
  storeAddress: string;
  photoUrl: string | null;
  marketingScore: number | null;
  marketingNotes: string | null;
  marketingFilledAt: string | null;
  operationsScore: number | null;
  operationsNotes: string | null;
  operationsFilledAt: string | null;
  grade: AbcGrade | null;
  media: AbcScoreMediaItem[];
};

export type AbcProgress = {
  marketing: { filled: number; total: number };
  operations: { filled: number; total: number };
};

export type AbcCycleDetail = AbcCycleSummary & {
  stores: AbcStoreScoreItem[];
  progress: AbcProgress;
};

export type AbcLeaderboardEntry = {
  rank: number;
  restaurantId: number;
  storeName: string;
  marketingScore: number | null;
  operationsScore: number | null;
  totalScore: number;
  grade: AbcGrade | null;
};

export type AbcLeaderboard = {
  cycle: AbcCycleSummary;
  entries: AbcLeaderboardEntry[];
};

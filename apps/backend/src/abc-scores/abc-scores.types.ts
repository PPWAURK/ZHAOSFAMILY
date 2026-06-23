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
  storeAddress: string;
  photoUrl: string | null;
  marketingScore: number | null;
  operationsScore: number | null;
  totalScore: number;
  grade: AbcGrade | null;
  // 与上一个已发布周期同店总分的差值；无对照周期时为 null。
  trend: number | null;
  // 关注点（取稽核备注）与检查日期（取稽核填写时间）。
  focus: string | null;
  auditDate: string | null;
  // 运营为该店上传的最新评分报告（objectKey）；无报告时为 null。点击门店可打开。
  reportObjectKey: string | null;
};

export type AbcLeaderboard = {
  cycle: AbcCycleSummary;
  entries: AbcLeaderboardEntry[];
};

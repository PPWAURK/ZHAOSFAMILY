export const USAGE_MODULES = [
  'dashboard',
  'stores',
  'recruitment',
  'case-shares',
  'orders',
  'waiting-queue',
  'profile',
  'training',
  'abc-scores',
  'suppliers',
  'inventory',
  'permissions',
  'screen-security',
  'recipes',
  'reports',
] as const;

export type UsageModule = (typeof USAGE_MODULES)[number];

export type DailyActiveUsers = {
  date: string;
  users: number;
};

export type ModuleUsage = {
  moduleName: UsageModule;
  opens: number;
  uniqueUsers: number;
};

export type MonthlyUsageReport = {
  month: string;
  startsAt: string;
  endsAt: string;
  activeUsers: number;
  moduleOpens: number;
  dailyActiveUsers: DailyActiveUsers[];
  moduleUsage: ModuleUsage[];
};

export type PlatformUsageSummary = {
  approvedUsers: number;
  activeUsers: number;
  activityRate: number | null;
  moduleOpens: number;
  expectedReads: number;
  confirmedReads: number;
  readRate: number | null;
};

export type StoreMonthlyUsage = PlatformUsageSummary & {
  restaurantId: number;
  storeCode: number;
  restaurantName: string;
  moduleUsage: ModuleUsage[];
  employeeUsage: EmployeeMonthlyUsage[];
};

export type EmployeeMonthlyUsage = {
  userId: number;
  employeeName: string;
  active: boolean;
  moduleOpens: number;
  moduleUsage: ModuleUsage[];
  expectedReads: number;
  confirmedReads: number;
  readRate: number | null;
};

export type NewsStoreReadRow = {
  postId: number;
  title: string;
  category: string;
  publishedAt: string;
  restaurantId: number;
  storeCode: number;
  restaurantName: string;
  expectedReads: number;
  confirmedReads: number;
  readRate: number | null;
};

export type PlatformMonthlyReport = {
  month: string;
  startsAt: string;
  endsAt: string;
  summary: PlatformUsageSummary;
  stores: StoreMonthlyUsage[];
  newsByStore: NewsStoreReadRow[];
};

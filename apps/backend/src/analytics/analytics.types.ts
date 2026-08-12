export const MOBILE_USAGE_MODULES = [
  'dashboard',
  'stores',
  'recruitment',
  'case-shares',
  'orders',
  'waiting-queue',
  'profile',
] as const;

export type MobileUsageModule = (typeof MOBILE_USAGE_MODULES)[number];

export type DailyActiveUsers = {
  date: string;
  users: number;
};

export type ModuleUsage = {
  moduleName: MobileUsageModule;
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

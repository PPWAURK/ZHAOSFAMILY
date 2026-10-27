import { apiClient } from "@/shared/api/api-client";

export type ModuleUsage = {
  moduleName: string;
  opens: number;
  uniqueUsers: number;
};

export type UsageSummary = {
  approvedUsers: number;
  activeUsers: number;
  activityRate: number | null;
  moduleOpens: number;
  expectedReads: number;
  confirmedReads: number;
  readRate: number | null;
};

export type StoreUsage = UsageSummary & {
  restaurantId: number;
  storeCode: number;
  restaurantName: string;
  moduleUsage: ModuleUsage[];
  employeeUsage: EmployeeUsage[];
};

export type EmployeeUsage = {
  userId: number;
  employeeName: string;
  active: boolean;
  moduleOpens: number;
  moduleUsage: ModuleUsage[];
  expectedReads: number;
  confirmedReads: number;
  readRate: number | null;
};

export type NewsStoreRead = {
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
  summary: UsageSummary;
  stores: StoreUsage[];
  newsByStore: NewsStoreRead[];
};

export function fetchPlatformMonthlyReport(month: string): Promise<PlatformMonthlyReport> {
  return apiClient.get<PlatformMonthlyReport>(
    `/analytics/platform/monthly?month=${encodeURIComponent(month)}`,
  );
}

export async function recordWebModuleOpen(moduleName: string): Promise<boolean> {
  try {
    await apiClient.post("/analytics/web/events", { moduleName });
    return true;
  } catch {
    // Analytics failure is non-blocking, but the structured result remains observable.
    return false;
  }
}

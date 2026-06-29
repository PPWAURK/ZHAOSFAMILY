import { apiClient } from "@/shared/api/apiClient";

type ScreenSecurityEventType = "screenshot" | "recording";

type ScreenSecurityEventApiRecord = {
  id: number | string;
  userId?: number | string | null;
  userName?: string | null;
  eventType?: string | null;
  screenName?: string | null;
  deviceInfo?: unknown;
  createdAt?: string | null;
};

type ScreenSecurityEventsApiResponse = {
  items?: ScreenSecurityEventApiRecord[] | null;
  page?: number | string | null;
  pageSize?: number | string | null;
  total?: number | string | null;
};

export type ScreenSecurityEvent = {
  id: string;
  userId: string;
  userName: string;
  eventType: ScreenSecurityEventType;
  screenName: string;
  deviceInfo: string;
  createdAt: string;
};

export type FetchScreenSecurityEventsParams = {
  page?: number;
  pageSize?: number;
  eventType?: ScreenSecurityEventType;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ScreenSecurityEventsResponse = {
  items: ScreenSecurityEvent[];
  page: number;
  pageSize: number;
  total: number;
};

function normalizeEventType(value: string | null | undefined): ScreenSecurityEventType {
  return value === "recording" ? "recording" : "screenshot";
}

function normalizeDeviceInfo(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeEvent(raw: ScreenSecurityEventApiRecord | null): ScreenSecurityEvent | null {
  if (!raw) {
    return null;
  }

  return {
    id: String(raw.id),
    userId: raw.userId === null || raw.userId === undefined ? "" : String(raw.userId),
    userName: raw.userName ?? "",
    eventType: normalizeEventType(raw.eventType),
    screenName: raw.screenName ?? "",
    deviceInfo: normalizeDeviceInfo(raw.deviceInfo),
    createdAt: raw.createdAt ?? "",
  };
}

function isDefined<T>(value: T | null): value is T {
  return value !== null;
}

function toPositiveNumber(value: number | string | null | undefined, fallback: number): number {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
}

export async function deleteScreenSecurityEvents(ids: string[]): Promise<number> {
  const numericIds = ids.map(Number).filter((id) => Number.isFinite(id) && id > 0);

  if (numericIds.length === 0) {
    return 0;
  }

  const data = await apiClient.delete<{ deletedCount?: number }>(
    "/training/screen-security-events",
    { data: { ids: numericIds } },
  );

  return data?.deletedCount ?? numericIds.length;
}

export async function fetchScreenSecurityEvents(
  params: FetchScreenSecurityEventsParams,
): Promise<ScreenSecurityEventsResponse> {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));
  query.set("pageSize", String(params.pageSize ?? 20));

  if (params.eventType) {
    query.set("eventType", params.eventType);
  }

  if (params.userId) {
    query.set("userId", params.userId);
  }

  if (params.dateFrom) {
    query.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    query.set("dateTo", params.dateTo);
  }

  const data = await apiClient.get<ScreenSecurityEventsApiResponse>(
    `/training/screen-security-events?${query.toString()}`,
  );

  return {
    items: Array.isArray(data?.items)
      ? data.items.map(normalizeEvent).filter(isDefined)
      : [],
    page: toPositiveNumber(data?.page, params.page ?? 1),
    pageSize: toPositiveNumber(data?.pageSize, params.pageSize ?? 20),
    total: Math.max(0, Number(data?.total) || 0),
  };
}

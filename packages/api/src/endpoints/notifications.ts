import type {
  ListNotificationsQuery,
  NotificationListResponse,
  UnreadCountResponse,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type NotificationsApi = {
  list: (query?: ListNotificationsQuery) => Promise<NotificationListResponse>;
  unreadCount: () => Promise<UnreadCountResponse>;
  markRead: (id: number | string) => Promise<UnreadCountResponse>;
  markAllRead: () => Promise<UnreadCountResponse>;
};

function buildListQuery(query?: ListNotificationsQuery): string {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  if (query.page !== undefined) {
    params.set("page", String(query.page));
  }
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export function createNotificationsApi(apiClient: ApiClient): NotificationsApi {
  return {
    list: (query) =>
      apiClient.get<NotificationListResponse>(`/notifications${buildListQuery(query)}`),
    unreadCount: () => apiClient.get<UnreadCountResponse>("/notifications/unread-count"),
    markRead: (id) =>
      apiClient.post<UnreadCountResponse>(`/notifications/${encodeURIComponent(id)}/read`),
    markAllRead: () => apiClient.post<UnreadCountResponse>("/notifications/read-all"),
  };
}

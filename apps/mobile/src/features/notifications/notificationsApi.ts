import { createNotificationsApi } from "@zhao/api";
import type {
  ListNotificationsQuery,
  NotificationListResponse,
  UnreadCountResponse,
} from "@zhao/types";
import { mobileApiClient } from "@/lib/api";

const notificationsApi = createNotificationsApi(mobileApiClient);

export function fetchNotifications(
  query?: ListNotificationsQuery,
): Promise<NotificationListResponse> {
  return notificationsApi.list(query);
}

export function fetchUnreadCount(): Promise<UnreadCountResponse> {
  return notificationsApi.unreadCount();
}

export function markNotificationRead(id: number): Promise<UnreadCountResponse> {
  return notificationsApi.markRead(id);
}

export function markAllNotificationsRead(): Promise<UnreadCountResponse> {
  return notificationsApi.markAllRead();
}

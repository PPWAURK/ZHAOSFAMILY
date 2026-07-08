import type { NotificationItem, PushTokenPlatform } from "./models";

export type RegisterPushTokenRequest = {
  token: string;
  platform: PushTokenPlatform;
  deviceName?: string;
};

export type UnregisterPushTokenRequest = {
  token: string;
};

export type ListNotificationsQuery = {
  page?: number;
  pageSize?: number;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
};

export type UnreadCountResponse = {
  unreadCount: number;
};

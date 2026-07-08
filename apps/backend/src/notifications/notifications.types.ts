export const PUSH_TOKEN_PLATFORMS = ['ios', 'android'] as const;

export type PushTokenPlatform = (typeof PUSH_TOKEN_PLATFORMS)[number];

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type ExpoPushSendResult = {
  /** Tokens Expo reported as no longer valid (DeviceNotRegistered). */
  invalidTokens: string[];
};

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/** View shape returned by the notification-center endpoints. */
export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationListResult = {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  unreadCount: number;
};

/** Expo accepts at most 100 messages per push request. */
export const EXPO_PUSH_CHUNK_SIZE = 100;

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

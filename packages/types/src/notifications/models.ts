export type PushTokenPlatform = "ios" | "android";

/**
 * Known notification `type` values, mirroring the `data.type` the backend sets
 * on each notification. Kept open (string) so new backend types never break the
 * client — the union documents the ones the app deep-links to.
 */
export type NotificationType =
  | "account-approved"
  | "training-material"
  | "dashboard-news"
  | "abc-leaderboard"
  | "case-share"
  | (string & {});

export type NotificationItem = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

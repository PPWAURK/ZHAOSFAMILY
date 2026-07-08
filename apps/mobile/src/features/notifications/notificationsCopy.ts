import type { AuthLanguage } from "@/features/auth/authCopy";

export type NotificationsCopy = {
  title: string;
  empty: string;
  markAll: string;
  close: string;
  bellLabel: string;
  loadError: string;
  justNow: string;
  minutesAgo: (value: number) => string;
  hoursAgo: (value: number) => string;
  daysAgo: (value: number) => string;
};

export const NOTIFICATIONS_COPY: Record<AuthLanguage, NotificationsCopy> = {
  zh: {
    title: "消息通知",
    empty: "暂无通知",
    markAll: "全部标为已读",
    close: "关闭",
    bellLabel: "打开消息通知",
    loadError: "加载失败，请稍后重试",
    justNow: "刚刚",
    minutesAgo: (value) => `${value} 分钟前`,
    hoursAgo: (value) => `${value} 小时前`,
    daysAgo: (value) => `${value} 天前`,
  },
  en: {
    title: "Notifications",
    empty: "No notifications yet",
    markAll: "Mark all as read",
    close: "Close",
    bellLabel: "Open notifications",
    loadError: "Failed to load, please try again later",
    justNow: "Just now",
    minutesAgo: (value) => `${value} min ago`,
    hoursAgo: (value) => `${value} h ago`,
    daysAgo: (value) => `${value} d ago`,
  },
  fr: {
    title: "Notifications",
    empty: "Aucune notification",
    markAll: "Tout marquer comme lu",
    close: "Fermer",
    bellLabel: "Ouvrir les notifications",
    loadError: "Échec du chargement, réessayez plus tard",
    justNow: "À l'instant",
    minutesAgo: (value) => `il y a ${value} min`,
    hoursAgo: (value) => `il y a ${value} h`,
    daysAgo: (value) => `il y a ${value} j`,
  },
};

/** Formats an ISO timestamp as a short relative label in the given language. */
export function formatRelativeTime(
  iso: string,
  copy: NotificationsCopy,
  now: number = Date.now(),
): string {
  const elapsedMs = now - new Date(iso).getTime();
  const minutes = Math.floor(elapsedMs / 60000);

  if (minutes < 1) {
    return copy.justNow;
  }
  if (minutes < 60) {
    return copy.minutesAgo(minutes);
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return copy.hoursAgo(hours);
  }

  return copy.daysAgo(Math.floor(hours / 24));
}

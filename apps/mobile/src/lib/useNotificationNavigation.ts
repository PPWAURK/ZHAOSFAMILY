import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";

/**
 * Dashboard entries a tapped notification can route to. These must match the
 * `activeEntry` values handled by DashboardHomeScreen.
 */
export type NotificationEntry = "home" | "training";

// Maps a notification's `data.type` (set by the backend) to a dashboard entry.
// Account approvals and announcements land on the home desk; new training
// material opens the training module.
const TYPE_TO_ENTRY: Record<string, NotificationEntry> = {
  "account-approved": "home",
  "dashboard-news": "home",
  "training-material": "training",
};

/**
 * Routes the user to the relevant module when they open the app by tapping a
 * push notification. Uses `useLastNotificationResponse` so it also handles taps
 * that launched the app from a killed state. Fires once per distinct tap.
 */
export function useNotificationNavigation(
  onNavigate: (entry: NotificationEntry) => void,
): void {
  const response = Notifications.useLastNotificationResponse();
  const handlerRef = useRef(onNavigate);
  handlerRef.current = onNavigate;

  useEffect(() => {
    const data = response?.notification.request.content.data as
      | { type?: unknown }
      | undefined;
    const type = data?.type;

    if (typeof type !== "string") {
      return;
    }

    const entry = TYPE_TO_ENTRY[type];
    if (entry) {
      handlerRef.current(entry);
    }
  }, [response]);
}

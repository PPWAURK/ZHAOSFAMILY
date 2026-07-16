import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Dashboard entries a tapped notification can route to. These must match the
 * `activeEntry` values handled by DashboardHomeScreen.
 */
export type NotificationEntry = "home" | "training" | "case-shares";

// Maps a notification's `data.type` (set by the backend) to a dashboard entry.
// Account approvals and announcements land on the home desk; new training material opens the training module; case
// likes/comments open the cases tab.
const TYPE_TO_ENTRY: Record<string, NotificationEntry> = {
  "account-approved": "home",
  "dashboard-news": "home",
  "training-material": "training",
  "case-share": "case-shares",
};

type NotificationResponse = Awaited<
  ReturnType<(typeof import("expo-notifications"))["getLastNotificationResponseAsync"]>
>;

function isExpoGoAndroid(): boolean {
  return Platform.OS === "android" && Constants.appOwnership === "expo";
}

function navigateFromResponse(
  response: NotificationResponse | null,
  onNavigate: (entry: NotificationEntry) => void,
): void {
  const data = response?.notification.request.content.data as { type?: unknown } | undefined;
  const type = data?.type;

  if (typeof type !== "string") {
    return;
  }

  const entry = TYPE_TO_ENTRY[type];
  if (entry) {
    onNavigate(entry);
  }
}

/** Resolves the dashboard entry a notification `type` deep-links to, if any. */
export function resolveNotificationEntry(
  type: string | undefined | null,
): NotificationEntry | null {
  if (typeof type !== "string") {
    return null;
  }

  return TYPE_TO_ENTRY[type] ?? null;
}

/**
 * Routes the user to the relevant module when they open the app by tapping a
 * push notification. Uses `useLastNotificationResponse` so it also handles taps
 * that launched the app from a killed state. Fires once per distinct tap.
 */
export function useNotificationNavigation(onNavigate: (entry: NotificationEntry) => void): void {
  const handlerRef = useRef(onNavigate);
  handlerRef.current = onNavigate;

  useEffect(() => {
    if (isExpoGoAndroid()) {
      return;
    }

    let isMounted = true;
    let subscription: { remove: () => void } | null = null;

    async function registerNotificationListener(): Promise<void> {
      const notifications = await import("expo-notifications");

      if (!isMounted) {
        return;
      }

      const lastResponse = await notifications.getLastNotificationResponseAsync();

      if (isMounted) {
        navigateFromResponse(lastResponse, handlerRef.current);
      }

      subscription = notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromResponse(response, handlerRef.current);
      });
    }

    void registerNotificationListener();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);
}

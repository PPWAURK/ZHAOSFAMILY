import { useEffect } from "react";
import { useStore } from "zustand";
import { mobileAuthStore } from "@/lib/api";
import { registerPushToken } from "@/lib/pushNotifications";

/**
 * Registers the device's push token with the backend whenever the user becomes
 * authenticated. Push delivery is best-effort, so failures are swallowed.
 */
export function usePushTokenRegistration(): void {
  const status = useStore(mobileAuthStore, (state) => state.status);

  useEffect(() => {
    if (status !== "authenticated") return;

    void registerPushToken().catch(() => {
      // Non-critical: a missing token only means no push, not a broken session.
    });
  }, [status]);
}

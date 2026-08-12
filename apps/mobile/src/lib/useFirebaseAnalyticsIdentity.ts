import { mobileAuthStore } from "@/lib/api";
import {
  clearAnalyticsUser,
  identifyAnalyticsUser,
} from "@/lib/firebaseAnalytics";
import { useEffect } from "react";
import { useStore } from "zustand";

export function useFirebaseAnalyticsIdentity(): void {
  const authStatus = useStore(mobileAuthStore, (state) => state.status);
  const user = useStore(mobileAuthStore, (state) => state.user);

  useEffect(() => {
    if (authStatus !== "authenticated" || !user) {
      clearAnalyticsUser();
      return;
    }

    identifyAnalyticsUser(user);
  }, [authStatus, user]);
}

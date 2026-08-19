import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  type Query,
} from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useStore } from "zustand";
import { mobileAuthStore } from "@/lib/api";
import { clearUserMediaCache } from "@/lib/mediaCache";

const CACHE_KEY_PREFIX = "zhao-mobile-query-cache-v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const status = resolveHttpStatus(error);

  return failureCount < 2 && (!status || status >= 500);
}

function resolveHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if (
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return undefined;
}

function shouldPersistQuery(query: Query): boolean {
  return query.meta?.persist === true;
}

function createMobileQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: CACHE_MAX_AGE_MS,
        refetchOnReconnect: true,
        refetchOnWindowFocus: "always",
        retry: shouldRetryQuery,
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}

type MobileQueryProviderProps = { children: ReactNode };

export function MobileQueryProvider({ children }: MobileQueryProviderProps): ReactNode {
  const [queryClient] = useState(createMobileQueryClient);
  const userId = useStore(mobileAuthStore, (state) => state.user?.id ?? null);
  const previousUserIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      focusManager.setFocused(state === "active");
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;

    if (previousUserId !== null && previousUserId !== userId) {
      void clearUserMediaCache(previousUserId);
    }

    previousUserIdRef.current = userId;

    if (!userId) {
      queryClient.clear();
      return undefined;
    }

    // A single in-memory client survives an account change. Clearing before
    // hydration prevents a different user's cached response from flashing.
    queryClient.clear();

    const persister = createAsyncStoragePersister({
      key: `${CACHE_KEY_PREFIX}-${userId}`,
      storage: AsyncStorage,
    });

    const [unsubscribe, restorePromise] = persistQueryClient({
      dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      maxAge: CACHE_MAX_AGE_MS,
      persister,
      queryClient,
    });

    void restorePromise;
    return unsubscribe;
  }, [queryClient, userId]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

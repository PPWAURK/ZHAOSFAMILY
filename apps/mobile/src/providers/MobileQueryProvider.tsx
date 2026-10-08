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
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useStore } from "zustand";
import { mobileAuthActions, mobileAuthStore, setMobileNetworkOnline } from "@/lib/api";
import { clearUserMediaCache } from "@/lib/mediaCache";

const CACHE_KEY_PREFIX = "zhao-mobile-query-cache-v1";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "OFFLINE_READ_ONLY"
  ) {
    return false;
  }

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
  const userId = useStore(mobileAuthStore, (state) => state.user?.id ?? null);
  const authStatus = useStore(mobileAuthStore, (state) => state.status);
  const [isNetworkOnline, setIsNetworkOnline] = useState(false);
  const queryClient = useMemo(createMobileQueryClient, [userId]);
  const previousUserIdRef = useRef<number | string | null>(null);
  const previousQueryClientRef = useRef(queryClient);
  const previousNetworkOnlineRef = useRef(isNetworkOnline);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      focusManager.setFocused(state === "active");

      if (state === "active" && isNetworkOnline && authStatus === "offline") {
        void mobileAuthActions.revalidateSession().catch((error: unknown) => {
          console.warn("Unable to revalidate the cached mobile session.", error);
        });
      }
    });

    return () => subscription.remove();
  }, [authStatus, isNetworkOnline]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setMobileNetworkOnline(isOnline);
      setIsNetworkOnline(isOnline);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    onlineManager.setOnline(isNetworkOnline && authStatus !== "offline" && authStatus !== "loading");
  }, [authStatus, isNetworkOnline]);

  useEffect(() => {
    const hasJustReconnected = isNetworkOnline && !previousNetworkOnlineRef.current;
    previousNetworkOnlineRef.current = isNetworkOnline;
    if (!hasJustReconnected || authStatus !== "offline") return;

    void mobileAuthActions.revalidateSession().catch((error: unknown) => {
      console.warn("Unable to revalidate the cached mobile session.", error);
    });
  }, [authStatus, isNetworkOnline]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;

    if (previousUserId !== null && previousUserId !== userId) {
      previousQueryClientRef.current.clear();
      void clearUserMediaCache(previousUserId).catch((error: unknown) => {
        console.warn("Unable to clear the previous account's image cache.", error);
      });
      void AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}-${previousUserId}`).catch(
        (error: unknown) => {
          console.warn("Unable to clear the previous account's query cache.", error);
        },
      );
    }

    previousUserIdRef.current = userId;
    previousQueryClientRef.current = queryClient;
  }, [queryClient, userId]);

  const persister = useMemo(
    () =>
      userId === null
        ? null
        : createAsyncStoragePersister({
            key: `${CACHE_KEY_PREFIX}-${userId}`,
            storage: AsyncStorage,
          }),
    [userId],
  );

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      key={String(userId)}
      client={queryClient}
      persistOptions={{
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        maxAge: CACHE_MAX_AGE_MS,
        persister,
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

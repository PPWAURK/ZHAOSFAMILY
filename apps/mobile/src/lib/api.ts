import {
  createApiClient,
  createAuthApi,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@zhao/api";
import { createAuthActions, createAuthStore } from "@zhao/auth";
import { MOBILE_API_URL } from "@/lib/env";
import { secureTokenStorage } from "@/lib/tokenStorage";
import { mobileUserSnapshotStorage } from "@/lib/userSnapshotStorage";

function syncAccessToken(token: string | null): void {
  setAccessToken(token);
}

function syncRefreshToken(token: string | null): void {
  setRefreshToken(token);
}

async function persistAccessToken(token: string | null): Promise<void> {
  syncAccessToken(token);
  if (token) {
    await secureTokenStorage.setAccessToken(token);
    return;
  }

  await secureTokenStorage.removeAccessToken();
}

async function persistRefreshToken(token: string | null): Promise<void> {
  syncRefreshToken(token);
  if (token) {
    await secureTokenStorage.setRefreshToken(token);
    return;
  }

  await secureTokenStorage.removeRefreshToken();
}

let rejectMobileSession: (error: unknown) => Promise<void> = async () => undefined;
let markMobileSessionOffline: () => void = () => undefined;

export const mobileApiClient = createApiClient({
  baseURL: MOBILE_API_URL,
  getAccessToken,
  getRefreshToken,
  onAuthRejected: (error) => rejectMobileSession(error),
  onRefreshUnavailable: () => markMobileSessionOffline(),
  preserveTokensOnRefreshFailure: true,
  setAccessToken: persistAccessToken,
  setRefreshToken: persistRefreshToken,
});

mobileApiClient.axios.defaults.timeout = 15_000;

export const mobileAuthApi = createAuthApi(mobileApiClient);

export const mobileAuthStore = createAuthStore();
let isMobileNetworkOnline: boolean | null = null;

export function setMobileNetworkOnline(isOnline: boolean): void {
  isMobileNetworkOnline = isOnline;
}

export class OfflineReadOnlyError extends Error {
  readonly code = "OFFLINE_READ_ONLY";

  constructor() {
    super("This action requires an internet connection.");
    this.name = "OfflineReadOnlyError";
  }
}

mobileApiClient.axios.interceptors.request.use((config) => {
  const requestPath = config.url?.split("?")[0];
  const requestMethod = config.method?.toUpperCase();
  const isSessionValidationRequest =
    (requestPath === "/auth/refresh" && requestMethod === "POST") ||
    (requestPath === "/auth/me" && requestMethod === "GET");

  const isReadOnlySession = mobileAuthStore.getState().status === "offline";
  const isNetworkDisconnected = isMobileNetworkOnline === false;

  if ((isReadOnlySession || isNetworkDisconnected) && !isSessionValidationRequest) {
    return Promise.reject(new OfflineReadOnlyError());
  }

  return config;
});

const mobileAuthActionsInstance = createAuthActions({
  authApi: mobileAuthApi,
  store: mobileAuthStore,
  tokenStorage: secureTokenStorage,
  userSnapshotStorage: mobileUserSnapshotStorage,
  onUserSnapshotStorageError: (operation, error) => {
    console.warn(`Unable to ${operation} the local mobile user snapshot.`, error);
  },
  onTokenStorageClearError: (error) => {
    console.warn("Unable to clear the local mobile session credentials.", error);
  },
  syncAccessToken,
  syncRefreshToken,
});

rejectMobileSession = mobileAuthActionsInstance.rejectSession;
markMobileSessionOffline = mobileAuthActionsInstance.markSessionOffline;

export const mobileAuthActions = mobileAuthActionsInstance;

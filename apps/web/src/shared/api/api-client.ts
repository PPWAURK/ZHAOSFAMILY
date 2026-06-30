import {
  ApiClientError,
  createApiClient,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
} from "@zhao/api";

const ACCESS_TOKEN_STORAGE_KEY = "zhao_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "zhao_refresh_token";

export const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3002/api";

function hasBrowserStorage(): boolean {
  return typeof window !== "undefined";
}

function writeStoredToken(key: string, token: string | null): void {
  if (!hasBrowserStorage()) {
    return;
  }

  if (!token) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    return;
  }

  const shouldUseSession =
    sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) !== null ||
    sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) !== null;
  const targetStorage = shouldUseSession ? sessionStorage : localStorage;
  const otherStorage = shouldUseSession ? localStorage : sessionStorage;

  targetStorage.setItem(key, token);
  otherStorage.removeItem(key);
}

function readStoredToken(key: string): string | null {
  if (!hasBrowserStorage()) {
    return null;
  }

  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
}

function syncAccessToken(token: string | null): void {
  setAccessToken(token);
  writeStoredToken(ACCESS_TOKEN_STORAGE_KEY, token);
}

function syncRefreshToken(token: string | null): void {
  setRefreshToken(token);
  writeStoredToken(REFRESH_TOKEN_STORAGE_KEY, token);
}

export const apiClient = createApiClient({
  baseURL: API_URL,
  getAccessToken,
  getRefreshToken,
  setAccessToken: syncAccessToken,
  setRefreshToken: syncRefreshToken,
});

export {
  ApiClientError,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
};

// Browsers render <img>/<video>/<a> src URLs without an Authorization
// header, so media URLs carry the access token as a query param instead.
// The backend's /media/file route validates it the same way as the header.
// Fall back to storage when the in-memory token hasn't been hydrated yet
// (AuthContext sets it on mount) — otherwise the URL would ship without a
// token and the backend rejects it with ACCESS_TOKEN_REQUIRED.
export function buildMediaFileUrl(objectKey: string): string {
  const url = `${API_URL}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
  const token = getAccessToken() ?? readStoredToken(ACCESS_TOKEN_STORAGE_KEY);
  return token ? `${url}&token=${encodeURIComponent(token)}` : url;
}

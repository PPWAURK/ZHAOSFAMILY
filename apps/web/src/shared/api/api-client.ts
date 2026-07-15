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

const PRODUCT_IMAGE_PATH = "/products/images";
const LEGACY_PRODUCT_IMAGE_PATH = `/api${PRODUCT_IMAGE_PATH}`;
const PRODUCT_IMAGE_FILE_NAME_PATTERN =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

function getProductImagePath(image: string): string {
  if (!image.startsWith("http://") && !image.startsWith("https://")) {
    return image.split(/[?#]/, 1)[0];
  }

  try {
    return new URL(image).pathname;
  } catch {
    return image;
  }
}

function isCurrentApiUrl(image: string): boolean {
  if (!image.startsWith("http://") && !image.startsWith("https://")) {
    return true;
  }

  try {
    return new URL(image).origin === new URL(API_URL).origin;
  } catch {
    return false;
  }
}

function isInvalidProductImageUrl(image: string): boolean {
  if (!isCurrentApiUrl(image)) {
    return false;
  }

  const path = getProductImagePath(image);
  const isProductImagePath =
    path === PRODUCT_IMAGE_PATH ||
    path === LEGACY_PRODUCT_IMAGE_PATH ||
    path.startsWith(`${PRODUCT_IMAGE_PATH}/`) ||
    path.startsWith(`${LEGACY_PRODUCT_IMAGE_PATH}/`);

  return isProductImagePath && !PRODUCT_IMAGE_FILE_NAME_PATTERN.test(path);
}

export function resolveProductImageUrl(
  image: string | null | undefined,
): string {
  if (!image) return "";

  const normalizedImage = image.trim();
  if (!normalizedImage || isInvalidProductImageUrl(normalizedImage)) {
    return "";
  }

  if (normalizedImage.startsWith(`${LEGACY_PRODUCT_IMAGE_PATH}/`)) {
    return `${API_URL}${normalizedImage.slice("/api".length)}`;
  }

  if (normalizedImage.startsWith(`${PRODUCT_IMAGE_PATH}/`)) {
    return `${API_URL}${normalizedImage}`;
  }

  return normalizedImage;
}

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

export type SignedMediaUrl = {
  url: string;
  expiresAt: string;
};

// Exchanges an objectKey for a short-lived presigned URL that loads directly
// from the private bucket (R2). The request is authenticated with the normal
// Bearer header via apiClient, so the session token never enters the media URL.
// Prefer this (or the useMediaUrl hook) over buildMediaFileUrl.
export async function fetchSignedMediaUrl(
  objectKey: string,
): Promise<SignedMediaUrl> {
  return apiClient.get<SignedMediaUrl>(
    `/media/sign?objectKey=${encodeURIComponent(objectKey)}`,
  );
}

// @deprecated Legacy media URL that embeds the full access token as a query
// param (leaks into logs/history). Superseded by fetchSignedMediaUrl /
// useMediaUrl. Kept only until every consumer is migrated.
export function buildMediaFileUrl(objectKey: string): string {
  const url = `${API_URL}/media/file?objectKey=${encodeURIComponent(objectKey)}`;
  const token = getAccessToken() ?? readStoredToken(ACCESS_TOKEN_STORAGE_KEY);

  return token ? `${url}&token=${encodeURIComponent(token)}` : url;
}

export function buildBadgeImageUrl(fileName: string): string {
  return `${API_URL}/training/badges/svg/${encodeURIComponent(fileName)}`;
}

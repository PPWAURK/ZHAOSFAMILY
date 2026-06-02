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

function syncAccessToken(token: string | null): void {
  setAccessToken(token);

  if (token) {
    void secureTokenStorage.setAccessToken(token);
    return;
  }

  void secureTokenStorage.removeAccessToken();
}

function syncRefreshToken(token: string | null): void {
  setRefreshToken(token);

  if (token) {
    void secureTokenStorage.setRefreshToken(token);
    return;
  }

  void secureTokenStorage.removeRefreshToken();
}

export const mobileApiClient = createApiClient({
  baseURL: MOBILE_API_URL,
  getAccessToken,
  getRefreshToken,
  setAccessToken: syncAccessToken,
  setRefreshToken: syncRefreshToken,
});

export const mobileAuthApi = createAuthApi(mobileApiClient);

export const mobileAuthStore = createAuthStore();

export const mobileAuthActions = createAuthActions({
  authApi: mobileAuthApi,
  store: mobileAuthStore,
  tokenStorage: secureTokenStorage,
  syncAccessToken,
  syncRefreshToken,
});

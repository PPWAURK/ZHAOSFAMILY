import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "@zhao/auth";

const ACCESS_TOKEN_STORAGE_KEY = "zhao_access_token";
const REFRESH_TOKEN_STORAGE_KEY = "zhao_refresh_token";

export const secureTokenStorage: TokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
  setAccessToken: (token) => SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, token),
  removeAccessToken: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, token),
  removeRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY),
};

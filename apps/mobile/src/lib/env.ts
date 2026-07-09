import { Platform } from "react-native";

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
  };
};

const DEFAULT_MOBILE_API_URL = "http://localhost:3002/api";

function resolveMobileApiUrl(): string {
  const configuredUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    DEFAULT_MOBILE_API_URL;

  if (Platform.OS !== "android") {
    return configuredUrl;
  }

  return configuredUrl
    .replace("http://localhost:", "http://10.0.2.2:")
    .replace("http://127.0.0.1:", "http://10.0.2.2:");
}

export const MOBILE_API_URL = resolveMobileApiUrl();

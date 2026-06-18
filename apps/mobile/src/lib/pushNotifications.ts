import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type {
  PushTokenPlatform,
  RegisterPushTokenRequest,
} from "@zhao/types";
import { mobileApiClient } from "@/lib/api";

const PUSH_TOKENS_PATH = "/notifications/push-tokens";
const ANDROID_CHANNEL_ID = "default";

// Last Expo token we registered with the backend, kept so logout can revoke it
// while the access token is still present.
let lastRegisteredToken: string | null = null;

// Foreground presentation: show an alert + play a sound when a push arrives
// while the app is open.
Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
});

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#6F0D10",
  });
}

async function ensurePermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}

/**
 * Requests notification permission and resolves the device's Expo push token.
 * Returns null on simulators, when permission is denied, or when no EAS
 * projectId is configured.
 */
export async function getDevicePushToken(): Promise<RegisterPushTokenRequest | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  if (!(await ensurePermission())) return null;

  const projectId = resolveProjectId();
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  return {
    token,
    platform: Platform.OS as PushTokenPlatform,
    deviceName: Device.deviceName ?? undefined,
  };
}

/** Registers the current device's push token with the backend. */
export async function registerPushToken(): Promise<void> {
  const payload = await getDevicePushToken();
  if (!payload) return;

  await mobileApiClient.post(PUSH_TOKENS_PATH, payload);
  lastRegisteredToken = payload.token;
}

/**
 * Revokes the last registered push token. Call this while still authenticated,
 * i.e. before clearing the session on logout.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!lastRegisteredToken) return;

  const token = lastRegisteredToken;
  lastRegisteredToken = null;

  await mobileApiClient.delete(PUSH_TOKENS_PATH, { data: { token } });
}

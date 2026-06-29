import { useEffect, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { getCurrentScreen } from "@/lib/currentScreen";
import { reportScreenSecurityEvent } from "@/features/training/trainingApi";

const SCREEN_CAPTURE_PROTECTION_KEY = "zhao-family-mobile";
const SCREENSHOT_WARNING_TITLE = "检测到截图行为";
const SCREENSHOT_WARNING_MESSAGE =
  "已检测到截图操作，您的账号信息已被记录。学习资料和内部资料不允许截图、录屏或外传，请立即删除该截图。";

function reportScreenCaptureProtectionError(error: unknown): void {
  if (!__DEV__) {
    return;
  }

  console.warn("Screen capture protection is unavailable.", error);
}

function shouldShowPrivacyOverlay(appState: AppStateStatus): boolean {
  return appState !== "active";
}

export function useScreenCaptureProtection(): boolean {
  const [isPrivacyOverlayVisible, setIsPrivacyOverlayVisible] = useState(
    shouldShowPrivacyOverlay(AppState.currentState),
  );

  useEffect(() => {
    let isMounted = true;
    let screenshotSubscription: ScreenCapture.Subscription | null = null;
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (!isMounted) return;

        setIsPrivacyOverlayVisible(shouldShowPrivacyOverlay(nextAppState));
      },
    );

    async function enableProtection(): Promise<void> {
      // Screenshot listener is registered independently of the prevention
      // APIs so it still works in environments (e.g. Expo Go) where
      // isAvailableAsync returns false — the listener alone is enough to
      // detect screenshots and trigger the warning alert.
      //
      // On Android 13 and below, READ_MEDIA_IMAGES permission is required
      // for screenshot detection. On Android 14+ and iOS it works without
      // extra permission requests.
      try {
        let canListenForScreenshots = true;

        if (Platform.OS === "android") {
          const { status } = await ScreenCapture.requestPermissionsAsync();
          // Permission denied — skip the listener only.
          // preventScreenCaptureAsync below still blocks screenshots at
          // the OS level via FLAG_SECURE, so content remains protected.
          canListenForScreenshots = status === "granted";
        }

        if (canListenForScreenshots) {
          screenshotSubscription = ScreenCapture.addScreenshotListener(() => {
            if (!isMounted) return;

            Alert.alert(SCREENSHOT_WARNING_TITLE, SCREENSHOT_WARNING_MESSAGE);

            reportScreenSecurityEvent("screenshot", getCurrentScreen() || undefined, {
              platform: Platform.OS,
              osVersion: Platform.Version,
            }).catch(() => {});
          });
        }
      } catch (error) {
        if (isMounted) {
          reportScreenCaptureProtectionError(error);
        }
      }

      try {
        const isAvailable = await ScreenCapture.isAvailableAsync();

        if (!isAvailable) {
          throw new Error("ScreenCapture API is not available.");
        }

        await ScreenCapture.preventScreenCaptureAsync(
          SCREEN_CAPTURE_PROTECTION_KEY,
        );

        if (Platform.OS === "ios") {
          await ScreenCapture.enableAppSwitcherProtectionAsync(0.75);
        }
      } catch (error) {
        if (isMounted) {
          reportScreenCaptureProtectionError(error);
        }
      }
    }

    void enableProtection();

    return () => {
      isMounted = false;
      appStateSubscription.remove();
      screenshotSubscription?.remove();
      void ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_PROTECTION_KEY);
      if (Platform.OS === "ios") {
        void ScreenCapture.disableAppSwitcherProtectionAsync();
      }
    };
  }, []);

  return isPrivacyOverlayVisible;
}

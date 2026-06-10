import { useEffect, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

const SCREEN_CAPTURE_PROTECTION_KEY = "zhao-family-mobile";
const SCREENSHOT_WARNING_TITLE = "检测到截图";
const SCREENSHOT_WARNING_MESSAGE =
  "当前设备未能阻止这次截图。学习资料和内部资料不允许截图、录屏或外传，请立即删除该截图。";

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

        screenshotSubscription = ScreenCapture.addScreenshotListener(() => {
          if (!isMounted || Platform.OS !== "ios") return;

          Alert.alert(SCREENSHOT_WARNING_TITLE, SCREENSHOT_WARNING_MESSAGE);
        });
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

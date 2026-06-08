import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

const SCREEN_CAPTURE_PROTECTION_KEY = "zhao-family-mobile";
const SCREENSHOT_WARNING_TITLE = "安全提醒";
const SCREENSHOT_WARNING_MESSAGE =
  "学习资料和内部资料不允许截图、录屏或外传。";

function reportScreenCaptureProtectionError(error: unknown): void {
  if (!__DEV__) {
    return;
  }

  console.warn("Screen capture protection is unavailable.", error);
}

export function useScreenCaptureProtection(): void {
  useEffect(() => {
    let isMounted = true;
    let screenshotSubscription: ScreenCapture.Subscription | null = null;

    async function enableProtection(): Promise<void> {
      try {
        const isAvailable = await ScreenCapture.isAvailableAsync();

        if (!isAvailable) {
          throw new Error("ScreenCapture API is not available.");
        }

        await ScreenCapture.preventScreenCaptureAsync(
          SCREEN_CAPTURE_PROTECTION_KEY,
        );
        await ScreenCapture.enableAppSwitcherProtectionAsync(0.75);

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
      screenshotSubscription?.remove();
      void ScreenCapture.allowScreenCaptureAsync(SCREEN_CAPTURE_PROTECTION_KEY);
      void ScreenCapture.disableAppSwitcherProtectionAsync();
    };
  }, []);
}

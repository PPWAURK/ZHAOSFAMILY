import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { reportScreenSecurityEvent } from "@/features/training/trainingApi";
import { ScreenRecordingDetector } from "../../modules/screen-recording-detector/src";

// ---------------------------------------------------------------------------
// iOS recording detection via UIScreen.isCaptured
//
// expo-screen-capture only prevents screenshots (not recordings) on iOS.
// To detect screen recording we need a native Expo Module that subscribes to
// UIScreen.capturedDidChangeNotification.
//
// The module lives at apps/mobile/modules/screen-recording-detector/ and
// requires EAS Build or Dev Client to link – it will NOT work in Expo Go.
//
// When the module is absent this file degrades gracefully: recording detection
// is skipped and only expo-screen-capture screenshot prevention is active.
// ---------------------------------------------------------------------------

const PROTECTION_KEY = "zhao-protected-screen-content";

type ProtectedScreenProps = {
  children: ReactNode;
  /** Set to false to temporarily allow screenshots on this screen. */
  enabled?: boolean;
  /** Screen identifier reported in security audit events. */
  screenName?: string;
};

/**
 * Wraps children with screenshot / screen-recording protection.
 *
 * Behaviour by platform:
 *
 * **Android** – `expo-screen-capture` sets `FLAG_SECURE` which blocks both
 * screenshots and system screen recording at the OS level. Fully functional
 * in Expo Go.
 *
 * **iOS** – Screenshot prevention is applied via `expo-screen-capture`.
 * Screen *recording* detection requires a native Expo Module (see above).
 * When a recording is detected a full-screen black overlay is rendered on top
 * of the children. In Expo Go the detection degrades silently.
 *
 * Both platforms automatically restore the default capture state when this
 * component unmounts.
 */
export function ProtectedScreen({
  children,
  enabled = true,
  screenName,
}: ProtectedScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const isMountedRef = useRef(true);

  // ── expo-screen-capture protection ──────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    isMountedRef.current = true;

    async function protect(): Promise<void> {
      try {
        await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
        await ScreenCapture.enableAppSwitcherProtectionAsync(0.5);
      } catch (error: unknown) {
        if (__DEV__) {
          console.warn(
            "[ProtectedScreen] expo-screen-capture unavailable:",
            error,
          );
        }
      }
    }

    protect();

    return () => {
      isMountedRef.current = false;
      ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY).catch(() => {});
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, [enabled]);

  // ── iOS recording detection (native module, EAS Build only) ─────────────
  useEffect(() => {
    if (!enabled || Platform.OS !== "ios") return;

    // Check initial state
    setIsRecording(ScreenRecordingDetector.isCaptured);

    const subscription = ScreenRecordingDetector.addListener(
      (captured: boolean) => {
        if (isMountedRef.current) {
          setIsRecording(captured);

          if (captured) {
            reportScreenSecurityEvent("recording", screenName, {
              platform: Platform.OS,
              osVersion: Platform.Version,
            }).catch(() => {});
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  return (
    <View style={styles.container}>
      {children}
      {isRecording ? (
        <View style={styles.recordingOverlay} pointerEvents="none" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  recordingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
});

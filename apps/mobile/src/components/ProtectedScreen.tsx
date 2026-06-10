import { useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

// ---------------------------------------------------------------------------
// iOS recording detection via UIScreen.isCaptured
//
// On iOS/iPadOS, Expo ScreenCapture support can vary by OS version, device
// mode, and runtime. We still listen for screenshots as a fallback when a
// device does not block the capture.
//
// The module lives at apps/mobile/modules/screen-recording-detector/ and
// requires EAS Build or Dev Client to link – it will NOT work in Expo Go.
//
// When the module is absent this file degrades gracefully: recording detection
// is skipped and only expo-screen-capture protection remains active.
// ---------------------------------------------------------------------------

type IOSRecordingDetectorModule = {
  isCaptured: boolean;
  addListener: (
    callback: (isCaptured: boolean) => void,
  ) => { remove: () => void };
};

let IOSRecordingDetector: IOSRecordingDetectorModule | null = null;

try {
  // Dynamic require – throws at runtime if the native module isn't linked.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rawModule = require("expo-screen-recording-detector");
  if (rawModule?.ScreenRecordingDetector) {
    IOSRecordingDetector = rawModule.ScreenRecordingDetector;
  }
} catch {
  // Native module not linked – running in Expo Go or pre-build.
}

const PROTECTION_KEY = "zhao-protected-screen-content";

type ProtectedScreenProps = {
  children: ReactNode;
  /** Set to false to temporarily allow screenshots on this screen. */
  enabled?: boolean;
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
 * **iOS/iPadOS** – `expo-screen-capture` handles supported capture blocking.
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

        if (Platform.OS === "ios") {
          await ScreenCapture.enableAppSwitcherProtectionAsync(0.5);
        }
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
      if (Platform.OS === "ios") {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, [enabled]);

  // ── iOS recording detection (native module, EAS Build only) ─────────────
  useEffect(() => {
    if (!enabled || Platform.OS !== "ios" || !IOSRecordingDetector) return;

    // Check initial state
    setIsRecording(IOSRecordingDetector.isCaptured);

    const subscription = IOSRecordingDetector.addListener(
      (captured: boolean) => {
        if (isMountedRef.current) {
          setIsRecording(captured);
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

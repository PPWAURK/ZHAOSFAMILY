/* eslint-disable @typescript-eslint/no-require-imports */

type AddListenerFn = (
  callback: (isCaptured: boolean) => void,
) => { remove: () => void };

// ---------------------------------------------------------------------------
// Lazy-load expo-modules-core – it is only available when the native module
// is linked (EAS Build / Dev Client).  The try/catch ensures Expo Go does not
// crash and simply skips recording detection.
// ---------------------------------------------------------------------------

type NativeScreenDetector = {
  isCaptured: boolean;
};

type NativeEventEmitter = {
  addListener: (
    eventName: string,
    listener: (event: Record<string, unknown>) => void,
  ) => { remove: () => void };
};

let nativeDetector: NativeScreenDetector | null = null;
let nativeEmitter: NativeEventEmitter | null = null;

try {
  const modCore = require("expo-modules-core") as {
    NativeModuleProxy?: Record<string, unknown>;
    EventEmitter?: new (module: unknown) => NativeEventEmitter;
  };

  const rawDetector = modCore.NativeModuleProxy
    ?.ScreenRecordingDetector as NativeScreenDetector | undefined;

  if (rawDetector) {
    nativeDetector = rawDetector;
    nativeEmitter = modCore.EventEmitter
      ? new modCore.EventEmitter(rawDetector)
      : null;
  }
} catch {
  // Native module not linked – running in Expo Go or pre-build.
}

/**
 * iOS screen-recording detection.
 *
 * Uses UIScreen.isCaptured under the hood. Only works in EAS Build /
 * Dev Client builds — silent no-op in Expo Go.
 */
export const ScreenRecordingDetector = {
  /** Whether the iOS screen is being captured (recorded / mirrored). */
  get isCaptured(): boolean {
    return nativeDetector?.isCaptured ?? false;
  },

  /**
   * Subscribe to recording state changes.
   * The callback fires whenever UIScreen.isCaptured changes.
   * Returns a no-op subscription when the native module is unavailable.
   */
  addListener: ((callback: (isCaptured: boolean) => void) => {
    if (!nativeEmitter) {
      return { remove: () => {} };
    }

    return nativeEmitter.addListener("onCapturedChanged", (event) => {
      callback(Boolean(event.isCaptured));
    });
  }) as AddListenerFn,
};

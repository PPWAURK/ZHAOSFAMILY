import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Cross-platform shadows
//
// iOS ignores `elevation` and uses shadow* props; Android ignores shadow*
// and uses `elevation`. This utility returns the correct props per platform.
// ---------------------------------------------------------------------------

export type CrossPlatformShadowConfig = {
  /** iOS shadowColor – defaults to #000 */
  color?: string;
  /** iOS shadowOffset – defaults to { width: 0, height: 4 } */
  offset?: { width: number; height: number };
  /** iOS shadowOpacity – defaults to 0.15 */
  opacity?: number;
  /** iOS shadowRadius – defaults to 8 */
  radius?: number;
  /** Android elevation – defaults to 8 */
  elevation?: number;
};

export function crossPlatformShadow(
  config: CrossPlatformShadowConfig = {},
): Record<string, unknown> {
  const {
    color = "#000",
    offset = { width: 0, height: 4 },
    opacity = 0.15,
    radius = 8,
    elevation = 8,
  } = config;

  if (Platform.OS === "android") {
    return { elevation };
  }

  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}

// ---------------------------------------------------------------------------
// Cross-platform font families
//
// Generic families ("serif", "monospace") map to different system fonts on
// each platform, with different metrics (x-height, ascenders, letterfit).
// This is the most common source of cross-platform visual inconsistency.
//
// Current mapping:
//   iOS  "serif"     → Times New Roman (Latin) + system CJK (PingFang/STSong)
//   iOS  "monospace" → Menlo / Courier
//   iOS  "system"    → San Francisco
//
//   Andr "serif"     → Noto Serif (Latin + CJK)
//   Andr "monospace" → Droid Sans Mono
//   Andr "system"    → Roboto / Noto Sans
//
// For true consistency the app should load custom fonts via expo-font.
// Step-by-step migration path:
//
//   1. Place .ttf/.otf files in apps/mobile/assets/fonts/
//   2. Load them in app/_layout.tsx via useFonts() from expo-font
//   3. Update the values below to match the loaded font family names
//
// Recommended free fonts that support both Latin and CJK:
//   - Noto Serif (Google) – serif
//   - Noto Sans Mono (Google) – monospace
//
// For now these constants centralize all font references so that when
// custom fonts arrive, only this file needs to change.
// ---------------------------------------------------------------------------

export const fontFamilies = {
  serif: "serif",
  mono: "monospace",
} as const;

// ---------------------------------------------------------------------------
// Platform-specific style helpers
// ---------------------------------------------------------------------------

export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";

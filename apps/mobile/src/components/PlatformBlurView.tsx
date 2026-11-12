import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";

interface PlatformBlurViewProps {
  children?: ReactNode;
  intensity: number;
  style?: StyleProp<ViewStyle>;
  tint?: "light" | "dark" | "default";
}

/**
 * Real blur on iOS; a plain View on Android.
 * expo-blur's Android path re-renders the backdrop every frame and is noticeably heavier
 * there, and the callers already ship an opaque-enough Android background colour.
 */
export function PlatformBlurView({
  children,
  intensity,
  style,
  tint = "light",
}: PlatformBlurViewProps) {
  if (Platform.OS === "android") {
    return <View style={style}>{children}</View>;
  }

  return (
    <BlurView intensity={intensity} style={style} tint={tint}>
      {children}
    </BlurView>
  );
}

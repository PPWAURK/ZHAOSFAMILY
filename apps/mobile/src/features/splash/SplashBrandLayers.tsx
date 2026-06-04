import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

import { SPLASH_COLORS } from "@/features/splash/splashTiming";

export function SplashBackground(): ReactElement {
  return <View style={styles.background} />;
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_COLORS.paper,
  },
});

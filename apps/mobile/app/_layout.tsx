import "../src/styles/global.css";

import { SplashScreen } from "@/features/splash/SplashScreen";
import { useScreenCaptureProtection } from "@/lib/useScreenCaptureProtection";
import { usePushTokenRegistration } from "@/lib/usePushTokenRegistration";
import { Stack } from "expo-router";
import { StatusBar, StyleSheet, View } from "react-native";
import { isAndroid } from "@/lib/platform";

export default function RootLayout() {
  const isPrivacyOverlayVisible = useScreenCaptureProtection();

  usePushTokenRegistration();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={isAndroid ? false : undefined}
      />
      <Stack screenOptions={{ headerShown: false }} />
      <SplashScreen />
      {isPrivacyOverlayVisible ? (
        <View pointerEvents="none" style={styles.privacyOverlay} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    zIndex: 9999,
  },
});

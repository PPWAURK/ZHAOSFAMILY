import "../src/styles/global.css";

import { ConfirmProvider } from "@/components/confirm/ConfirmProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { SplashScreen } from "@/features/splash/SplashScreen";
import { useScreenCaptureProtection } from "@/lib/useScreenCaptureProtection";
import { usePushTokenRegistration } from "@/lib/usePushTokenRegistration";
import { mobileAuthActions } from "@/lib/api";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { isAndroid } from "@/lib/platform";

export default function RootLayout() {
  const isPrivacyOverlayVisible = useScreenCaptureProtection();

  usePushTokenRegistration();

  // 冷启动时用 SecureStore 中保存的 refresh token 恢复会话，
  // 避免每次杀后台重开都要重新登录。
  useEffect(() => {
    void mobileAuthActions.restoreSession();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={isAndroid ? false : undefined}
      />
      <ConfirmProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </ToastProvider>
      </ConfirmProvider>
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

import { ConfirmProvider } from "@/components/confirm/ConfirmProvider";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { SplashCompletionProvider } from "@/features/splash/SplashCompletionProvider";
import { useScreenCaptureProtection } from "@/lib/useScreenCaptureProtection";
import { usePushTokenRegistration } from "@/lib/usePushTokenRegistration";
import { useMobilePresence } from "@/lib/useMobilePresence";
import { useFirebaseAnalyticsIdentity } from "@/lib/useFirebaseAnalyticsIdentity";
import { mobileAuthActions } from "@/lib/api";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Image, StatusBar, StyleSheet, View } from "react-native";
import { isAndroid } from "@/lib/platform";
import privacyLogo from "../assets/logo2024/100%chinese.jpg";

export default function RootLayout() {
  const isPrivacyOverlayVisible = useScreenCaptureProtection();

  usePushTokenRegistration();
  useMobilePresence();
  useFirebaseAnalyticsIdentity();

  // 冷启动时用 SecureStore 中保存的 refresh token 恢复会话，
  // 避免每次杀后台重开都要重新登录。
  useEffect(() => {
    void mobileAuthActions.restoreSession();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SplashCompletionProvider>
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
      </SplashCompletionProvider>
      {isPrivacyOverlayVisible ? (
        <View pointerEvents="none" style={styles.privacyOverlay}>
          <Image
            resizeMode="contain"
            source={privacyLogo}
            style={styles.privacyLogo}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  privacyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  privacyLogo: {
    height: 96,
    width: 300,
  },
});

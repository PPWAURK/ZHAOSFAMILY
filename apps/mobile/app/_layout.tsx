import "../src/styles/global.css";

import { SplashScreen } from "@/features/splash/SplashScreen";
import { useScreenCaptureProtection } from "@/lib/useScreenCaptureProtection";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function RootLayout() {
  useScreenCaptureProtection();

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <SplashScreen />
    </View>
  );
}

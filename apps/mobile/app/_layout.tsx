import "../src/styles/global.css";

import { OpeningNoodleAnimation } from "@/features/auth/OpeningNoodleAnimation";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      <OpeningNoodleAnimation />
    </View>
  );
}

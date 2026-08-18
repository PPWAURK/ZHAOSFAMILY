import { useNetInfo } from "@react-native-community/netinfo";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

export function NetworkStatusBanner(): ReactNode {
  const network = useNetInfo();
  const isOffline = network.isConnected === false || network.isInternetReachable === false;

  if (!isOffline) return null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.root}>
      <Text style={styles.text}>Connexion indisponible · contenu enregistré affiché</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    backgroundColor: "#6f0d10",
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  text: { color: "#ffffff", fontSize: 12, fontWeight: "700", textAlign: "center" },
});

import type { ReactElement } from "react";
import { Image, StyleSheet } from "react-native";

import { SPLASH_STAGE } from "@/features/splash/splashTiming";

import logoImage from "../../../assets/logo2024/Logo_vertical_blanc.png";
import noodleImage from "../../../assets/ZHAO-元素element/noodle.png";

type NoodleAssetLayerProps = {
  side: "left" | "right";
};

export function NoodleAssetLayer({ side }: NoodleAssetLayerProps): ReactElement {
  return (
    <Image
      resizeMode="contain"
      source={noodleImage}
      style={[styles.noodle, side === "right" ? styles.noodleRight : null]}
    />
  );
}

export function LogoAssetLayer(): ReactElement {
  return <Image resizeMode="contain" source={logoImage} style={styles.logo} />;
}

const styles = StyleSheet.create({
  logo: {
    height: 220,
    left: (SPLASH_STAGE.width - 220) / 2,
    position: "absolute",
    top: 312,
    width: 220,
  },
  noodle: {
    height: 420,
    left: 28,
    position: "absolute",
    top: 214,
    width: 296,
  },
  noodleRight: {
    transform: [{ scaleX: -1 }],
  },
});

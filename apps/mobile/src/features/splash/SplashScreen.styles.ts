import { StyleSheet } from "react-native";

import { SPLASH_COLORS, SPLASH_STAGE } from "@/features/splash/splashTiming";

export const splashScreenStyles = StyleSheet.create({
  fullStage: {
    ...StyleSheet.absoluteFillObject,
  },
  opening: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_COLORS.paper,
    overflow: "hidden",
    zIndex: 999,
  },
  stage: {
    height: SPLASH_STAGE.height,
    left: "50%",
    marginLeft: -SPLASH_STAGE.width / 2,
    marginTop: -SPLASH_STAGE.height / 2,
    position: "absolute",
    top: "50%",
    width: SPLASH_STAGE.width,
  },
});

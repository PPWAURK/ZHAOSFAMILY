import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  useWindowDimensions,
} from "react-native";

import {
  LogoAssetLayer,
  NoodleAssetLayer,
} from "@/features/splash/SplashAssetLayers";
import { SplashBackground } from "@/features/splash/SplashBrandLayers";
import { splashScreenStyles as styles } from "@/features/splash/SplashScreen.styles";
import {
  SPLASH_DURATION_MS,
  SPLASH_EASING,
  SPLASH_STAGE,
  SPLASH_TIMELINE,
} from "@/features/splash/splashTiming";

type SplashScreenProps = {
  onFinish?: () => void;
  reduceMotionOverride?: boolean;
};

function atSplashTime(ms: number): number {
  return ms / SPLASH_DURATION_MS;
}

export function SplashScreen({
  onFinish,
  reduceMotionOverride,
}: SplashScreenProps): ReactElement | null {
  const { height, width } = useWindowDimensions();
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(
    typeof reduceMotionOverride === "boolean" ? reduceMotionOverride : null,
  );
  const progress = useRef(new Animated.Value(0)).current;

  const stageScale = useMemo(() => {
    const scaleX = width / SPLASH_STAGE.width;
    const scaleY = height / SPLASH_STAGE.height;

    return Math.max(scaleX, scaleY);
  }, [height, width]);

  const finishSplash = useCallback((): void => {
    setVisible(false);
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    if (typeof reduceMotionOverride === "boolean") {
      setReduceMotion(reduceMotionOverride);
      return;
    }

    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [reduceMotionOverride]);

  useEffect(() => {
    if (reduceMotion === null) return undefined;

    progress.setValue(0);

    const animation = Animated.timing(progress, {
      duration: reduceMotion ? 700 : SPLASH_DURATION_MS,
      easing: Easing.bezier(...SPLASH_EASING.outQuart),
      toValue: 1,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (finished) finishSplash();
    });

    return () => animation.stop();
  }, [finishSplash, progress, reduceMotion]);

  const stageOpacity = progress.interpolate({
    inputRange: [atSplashTime(SPLASH_TIMELINE.holdEnd), 1],
    outputRange: [1, 0],
  });
  const noodleOpacity = reduceMotion
    ? 0
    : progress.interpolate({
        inputRange: [
          0,
          atSplashTime(SPLASH_TIMELINE.focusEnd),
          atSplashTime(SPLASH_TIMELINE.noodleInEnd),
          atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
        ],
        outputRange: [0, 1, 1, 0],
      });
  const logoOpacity = progress.interpolate({
    inputRange: reduceMotion
      ? [0.1, 0.32, 1]
      : [atSplashTime(SPLASH_TIMELINE.logoStart), atSplashTime(SPLASH_TIMELINE.logoFull), 1],
    outputRange: [0, 1, 1],
  });

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.opening}>
      <SplashBackground />

      <Animated.View
        style={[
          styles.stage,
          {
            opacity: stageOpacity,
            transform: [{ scale: stageScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fullStage,
            {
              opacity: noodleOpacity,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: [-240, 0, 260],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: [-86, 0, -124],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: ["-46deg", "0deg", "540deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <NoodleAssetLayer side="left" />
        </Animated.View>

        <Animated.View
          style={[
            styles.fullStage,
            {
              opacity: noodleOpacity,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: [240, 0, -260],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: [86, 0, 124],
                  }),
                },
                {
                  rotate: progress.interpolate({
                    inputRange: [
                      atSplashTime(SPLASH_TIMELINE.focusEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleInEnd),
                      atSplashTime(SPLASH_TIMELINE.noodleOutEnd),
                    ],
                    outputRange: ["46deg", "0deg", "-540deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <NoodleAssetLayer side="right" />
        </Animated.View>

        <Animated.View
          style={[
            styles.fullStage,
            {
              opacity: logoOpacity,
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: reduceMotion
                      ? [0.1, 0.32, 1]
                      : [
                          atSplashTime(SPLASH_TIMELINE.logoStart),
                          atSplashTime(SPLASH_TIMELINE.logoFull),
                          1,
                        ],
                    outputRange: [0.78, 1, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LogoAssetLayer />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

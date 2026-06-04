import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

type ZhaoLoadingIndicatorTone = "red" | "light";
type ZhaoLoadingIndicatorVariant = "inline" | "button" | "overlay";

type ZhaoLoadingIndicatorProps = {
  label?: string;
  tone?: ZhaoLoadingIndicatorTone;
  variant?: ZhaoLoadingIndicatorVariant;
};

const COLORS = {
  red: "#c11616",
  light: "#ffffff",
  ink60: "rgba(10, 10, 10, 0.6)",
};

const BAR_OUTPUTS = [
  [1, 0.35, 0.55, 1],
  [0.45, 1, 0.35, 0.45],
  [0.35, 0.55, 1, 0.35],
];

export function ZhaoLoadingIndicator({
  label,
  tone = "red",
  variant = "inline",
}: ZhaoLoadingIndicatorProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const color = tone === "light" ? COLORS.light : COLORS.red;
  const isOverlay = variant === "overlay";

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        duration: 1100,
        easing: Easing.inOut(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [progress]);

  function buildBarStyle(index: number): ViewStyle {
    return {
      backgroundColor: color,
      opacity: progress.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: BAR_OUTPUTS[index],
      }),
      transform: [
        {
          scaleY: progress.interpolate({
            inputRange: [0, 0.33, 0.66, 1],
            outputRange: BAR_OUTPUTS[index],
          }),
        },
      ],
    };
  }

  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        variant === "button" ? styles.buttonRoot : null,
        isOverlay ? styles.overlayRoot : null,
      ]}
    >
      <View style={[styles.mark, isOverlay ? styles.overlayMark : null]}>
        {BAR_OUTPUTS.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              variant === "button" ? styles.buttonBar : null,
              isOverlay ? styles.overlayBar : null,
              buildBarStyle(index),
            ]}
          />
        ))}
      </View>
      {label ? (
        <Text
          style={[
            styles.label,
            tone === "light" ? styles.lightLabel : null,
            isOverlay ? styles.overlayLabel : null,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 999,
    height: 18,
    width: 4,
  },
  buttonBar: {
    height: 13,
    width: 3,
  },
  buttonRoot: {
    minHeight: 22,
  },
  label: {
    color: COLORS.ink60,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  lightLabel: {
    color: COLORS.light,
  },
  mark: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    height: 22,
    justifyContent: "center",
  },
  overlayBar: {
    height: 26,
    width: 5,
  },
  overlayLabel: {
    color: COLORS.red,
    fontSize: 14,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  overlayMark: {
    height: 34,
  },
  overlayRoot: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(193, 22, 22, 0.18)",
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  root: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
});

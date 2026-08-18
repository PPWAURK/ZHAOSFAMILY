import { useEffect, useRef, type ReactNode } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useMotionPreferences } from "@/lib/motion";

type SkeletonProps = { style?: StyleProp<ViewStyle> };

export function Skeleton({ style }: SkeletonProps): ReactNode {
  const { reduceMotion } = useMotionPreferences();
  const opacity = useRef(new Animated.Value(0.48)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.48);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 700, toValue: 0.8, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 700, toValue: 0.48, useNativeDriver: true }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[styles.block, { opacity }, style]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: "rgba(193, 22, 22, 0.1)" },
});

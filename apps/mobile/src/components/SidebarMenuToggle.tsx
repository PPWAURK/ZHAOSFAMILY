import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import LottieView from "lottie-react-native";
import sidebarMenuToggleAnimation from "@/components/assets/sidebar-menu-toggle.json";

type SidebarMenuToggleProps = {
  accessibilityLabel: string;
  deferPressUntilOpenAnimationCompletes?: boolean;
  isOpen: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

export const SidebarMenuToggle = forwardRef<View, SidebarMenuToggleProps>(
  function SidebarMenuToggle(
    { accessibilityLabel, deferPressUntilOpenAnimationCompletes = false, isOpen, onPress, style },
    ref,
  ) {
    const [reduceMotion, setReduceMotion] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    // Start from the menu state so a newly mounted drawer control can visibly
    // transition into its close state instead of appearing as an abrupt icon swap.
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      let isMounted = true;

      void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
        if (isMounted) setReduceMotion(isEnabled);
      });

      const subscription = AccessibilityInfo.addEventListener(
        "reduceMotionChanged",
        setReduceMotion,
      );

      return () => {
        isMounted = false;
        subscription.remove();
      };
    }, []);

    useEffect(() => {
      Animated.timing(progress, {
        duration: reduceMotion ? 0 : 240,
        easing: Easing.out(Easing.cubic),
        toValue: isOpen ? 1 : 0,
        useNativeDriver: false,
      }).start();
    }, [isOpen, progress, reduceMotion]);

    const handlePress = useCallback((): void => {
      if (!deferPressUntilOpenAnimationCompletes || isOpen) {
        onPress();
        return;
      }

      setIsOpening(true);
      Animated.timing(progress, {
        duration: reduceMotion ? 0 : 240,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: false,
      }).start(({ finished }) => {
        setIsOpening(false);
        if (finished) onPress();
      });
    }, [deferPressUntilOpenAnimationCompletes, isOpen, onPress, progress, reduceMotion]);

    return (
      <Pressable
        ref={ref}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        disabled={isOpening}
        onPress={handlePress}
        style={style}
      >
        <AnimatedLottieView
          progress={progress}
          source={sidebarMenuToggleAnimation}
          style={styles.animation}
        />
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  animation: {
    height: 24,
    width: 24,
  },
});

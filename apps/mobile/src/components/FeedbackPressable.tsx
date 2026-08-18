import { forwardRef, useRef, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import { motionDuration, useMotionPreferences } from "@/lib/motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type FeedbackPressableProps = Omit<PressableProps, "children" | "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const FeedbackPressable = forwardRef<View, FeedbackPressableProps>(
  function FeedbackPressable({ children, disabled, onPressIn, onPressOut, style, ...props }, ref) {
    const { reduceMotion } = useMotionPreferences();
    const pressed = useRef(new Animated.Value(0)).current;
    const animatedStyle = {
      opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.88] }),
      transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }],
    };

    function animatePressState(toValue: 0 | 1): void {
      Animated.timing(pressed, {
        duration: reduceMotion ? 0 : motionDuration.feedback,
        toValue,
        useNativeDriver: true,
      }).start();
    }

    function handlePressIn(event: Parameters<NonNullable<PressableProps["onPressIn"]>>[0]): void {
      animatePressState(1);
      onPressIn?.(event);
    }

    function handlePressOut(event: Parameters<NonNullable<PressableProps["onPressOut"]>>[0]): void {
      animatePressState(0);
      onPressOut?.(event);
    }

    return (
      <AnimatedPressable
        {...props}
        ref={ref}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[style, animatedStyle]}
      >
        {children}
      </AnimatedPressable>
    );
  },
);

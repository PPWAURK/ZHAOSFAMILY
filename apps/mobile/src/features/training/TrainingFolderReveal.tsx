import { Children, useEffect, useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

export const REVEAL_STEP_MS = 70;
export const REVEAL_MAX_STAGGER_STEPS = 10;
const REVEAL_DURATION_MS = 260;
const REVEAL_OFFSET_X = -18;

export function getRevealDelay(index: number): number {
  return Math.min(index, REVEAL_MAX_STAGGER_STEPS) * REVEAL_STEP_MS;
}

function RevealItem({ index, children }: { index: number; children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isActive = true;
    let animation: Animated.CompositeAnimation | null = null;

    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((isReduced) => {
        if (!isActive) return;
        if (isReduced) {
          progress.setValue(1);
          return;
        }
        animation = Animated.timing(progress, {
          delay: getRevealDelay(index),
          duration: REVEAL_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        });
        animation.start();
      });

    return () => {
      isActive = false;
      animation?.stop();
    };
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateX: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [REVEAL_OFFSET_X, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Children appear one after another, sliding in from the left.
 * Mount it when a folder opens so the animation plays on every open.
 */
export function RevealList({ children }: { children: ReactNode }) {
  return (
    <>
      {Children.toArray(children).map((child, index) => (
        <RevealItem key={index} index={index}>
          {child}
        </RevealItem>
      ))}
    </>
  );
}

import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export const motionDuration = {
  feedback: 140,
  transition: 240,
  screen: 280,
} as const;

export const motionEasing = {
  enter: [0.22, 1, 0.36, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
} as const;

export function useMotionPreferences(): { reduceMotion: boolean } {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) setReduceMotion(isEnabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return { reduceMotion };
}

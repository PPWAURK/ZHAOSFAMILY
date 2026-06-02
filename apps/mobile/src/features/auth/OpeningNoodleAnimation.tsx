import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import zhaoLogo from '@/features/auth/assets/logo2024竖版.jpg';

const RED = "#8c1414";
const RED_DEEP = "#6f0707";
const CREAM = "#ffffff";
const NOODLE = "#ffdca9";

const STRAND_OFFSETS = [-18, -12, -7, -3, 2, 7, 12, 17];

export function OpeningNoodleAnimation(): ReactElement | null {
  const { width, height } = useWindowDimensions();

  const [visible, setVisible] = useState(true);
  const [band] = useState(() => new Animated.Value(0));
  const [bandExit] = useState(() => new Animated.Value(0));
  const [brand] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(0));

  const stage = useMemo(() => {
    const bandTop = Math.max(250, height * 0.44);

    return {
      bandTop,
      brandTop: Math.max(350, height * 0.4),
      noodleWidth: width + 112,
    };
  }, [height, width]);

  useEffect(() => {
    const animation = Animated.sequence([
      // 1. 小面出现
      Animated.timing(band, {
        toValue: 0.22,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      // 2. 停顿一下
      Animated.delay(250),

      // 3. 快速拉开
      Animated.timing(band, {
        toValue: 1,
        duration: 760,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),

      // 4. 面停留
      Animated.delay(220),

      // 5. 面消失
      Animated.timing(bandExit, {
        toValue: 1,
        duration: 460,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),

      // 6. Logo 出现
      Animated.timing(brand, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }),

      // 7. Logo 完整显示停留久一点
      Animated.delay(1300),

      // 8. Logo 缩小淡出 + 页面消失
      Animated.timing(exit, {
        toValue: 1,
        duration: 500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => animation.stop();
  }, [band, bandExit, brand, exit]);

  if (!visible) return null;

  const screenStyle = {
    opacity: exit.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  const bandStyle = {
    opacity: bandExit.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
    transform: [
      {
        scaleX: band.interpolate({
          inputRange: [0, 0.22, 0.82, 1],
          outputRange: [0.08, 0.22, 1.08, 1],
        }),
      },
      {
        scaleY: bandExit.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.15],
        }),
      },
      {
        translateY: band.interpolate({
          inputRange: [0, 0.22, 1],
          outputRange: [22, 18, 0],
        }),
      },
    ],
  };

  const brandStyle = {
    opacity: Animated.multiply(
        brand,
        exit.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        }),
    ),
    transform: [
      {
        translateY: brand.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
      {
        scale: Animated.multiply(
            brand.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
            exit.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.72],
            }),
        ),
      },
    ],
  };

  return (
      <Animated.View pointerEvents="none" style={[styles.opening, screenStyle]}>
        <View style={styles.redField} />

        <Animated.View
            style={[
              styles.noodleBand,
              {
                top: stage.bandTop,
                left: -56,
                width: stage.noodleWidth,
              },
              bandStyle,
            ]}
        >
          {STRAND_OFFSETS.map((offset, index) => (
              <View
                  key={offset}
                  style={[
                    styles.noodleStrand,
                    {
                      opacity: 0.72 + index * 0.026,
                      top: 28 + offset,
                      transform: [{ rotate: `${(index - 3.5) * 0.22}deg` }],
                    },
                  ]}
              />
          ))}

          <View style={styles.noodleGlow} />
        </Animated.View>

        <Animated.View
            style={[
              styles.brand,
              {
                top: stage.brandTop,
              },
              brandStyle,
            ]}
        >
          <Image
              source={zhaoLogo}
              style={styles.logo}
              resizeMode="contain"
              tintColor={CREAM}
          />
        </Animated.View>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  opening: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RED,
    overflow: "hidden",
    zIndex: 999,
  },

  redField: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RED,
    shadowColor: RED_DEEP,
    shadowOpacity: 0.82,
    shadowRadius: 80,
  },

  noodleBand: {
    height: 94,
    position: "absolute",
    zIndex: 2,
  },

  noodleGlow: {
    backgroundColor: "rgba(255, 247, 232, 0.84)",
    borderRadius: 999,
    height: 10,
    left: 34,
    position: "absolute",
    right: 34,
    shadowColor: NOODLE,
    shadowOpacity: 0.95,
    shadowRadius: 20,
    top: 44,
  },

  noodleStrand: {
    backgroundColor: NOODLE,
    borderRadius: 999,
    height: 6,
    left: 26,
    position: "absolute",
    right: 26,
    shadowColor: CREAM,
    shadowOpacity: 0.55,
    shadowRadius: 5,
  },

  brand: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 3,
  },

  logo: {
    height: 200,
    width: 200,
  },
});
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import { MOBILE_API_URL } from "@/lib/env";
import type { TrainingBadge } from "@/features/training/trainingTypes";

type TrainingBadgeSvgProps = {
  badge: Pick<TrainingBadge, "code" | "imageFileName" | "name">;
  size: number;
};

const BADGE_FRAME_PREFIXES = ["badge"];

function isBadgeFrame(fileName: string): boolean {
  const name = fileName.replace(/\.svg$/i, "");

  return BADGE_FRAME_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}-`));
}

function buildBadgeImageUrl(fileName: string): string {
  return `${MOBILE_API_URL}/training/badges/svg/${encodeURIComponent(fileName)}`;
}

export function TrainingBadgeSvg({ badge, size }: TrainingBadgeSvgProps) {
  const [svgXml, setSvgXml] = useState<string | null>(null);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const cacheRef = useRef<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const source = buildBadgeImageUrl(badge.imageFileName || "badge.svg");

    if (cacheRef.current) {
      setSvgXml(cacheRef.current);
      return () => {
        isActive = false;
      };
    }

    setSvgXml(null);
    setHasLoadFailed(false);

    fetch(source)
      .then((response) => {
        if (!response.ok) throw new Error("BADGE_SVG_NOT_FOUND");
        return response.text();
      })
      .then((xml) => {
        cacheRef.current = xml;
        if (isActive) setSvgXml(xml);
      })
      .catch(() => {
        if (isActive) setHasLoadFailed(true);
      });

    return () => {
      isActive = false;
    };
  }, [badge.code, badge.imageFileName]);

  if (hasLoadFailed) {
    return (
      <View style={[styles.fallback, { height: size, width: size }]}>
        <Ionicons color={authControlStyles.colors.red} name="ribbon-outline" size={size * 0.56} />
      </View>
    );
  }

  if (!svgXml) {
    return <View style={{ height: size, width: size }} />;
  }

  const fileName = badge.imageFileName || "badge.svg";
  const shouldScaleIcon = !isBadgeFrame(fileName);

  return (
    <View style={[styles.viewport, { height: size, width: size }]}>
      <SvgXml
        xml={svgXml}
        style={shouldScaleIcon ? styles.scaledIcon : undefined}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: "rgba(193, 22, 22, 0.08)",
    borderColor: "rgba(193, 22, 22, 0.28)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
  },
  scaledIcon: {
    transform: [{ scale: 1.05}],
  },
  viewport: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

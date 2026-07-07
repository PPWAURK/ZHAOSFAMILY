import { Pressable, Text, View } from "react-native";
import type { TitleCategory, TitleFrameSize, TitleIconType, TitleRarity } from "@/types/title";

export interface TitleCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  level?: number;
  category: TitleCategory;
  rarity: TitleRarity;
  iconType?: TitleIconType;
  locked?: boolean;
  selected?: boolean;
  size?: TitleFrameSize;
  progress?: number;
  unlockHint?: string;
  onSelect?: (titleId: string) => void;
}

const CATEGORY_COLOR: Record<TitleCategory, string> = {
  growth: "#D71920",
  front: "#D71920",
  kitchen: "#E36A2E",
  management: "#A9151C",
  fun: "#8F4BD8",
  premium: "#C6922E",
};

const SIZE_MAP: Record<TitleFrameSize, { width: number; height: number }> = {
  sm: { width: 180, height: 96 },
  md: { width: 240, height: 132 },
  lg: { width: 360, height: 190 },
};

function clampProgress(progress: number | undefined): number {
  if (typeof progress !== "number" || Number.isNaN(progress)) return 0;
  return Math.min(100, Math.max(0, progress));
}

export function TitleCard({
  id,
  title,
  subtitle,
  level,
  category,
  rarity,
  locked = false,
  selected = false,
  size = "md",
  progress,
  unlockHint,
  onSelect,
}: TitleCardProps) {
  const dimensions = SIZE_MAP[size];
  const color = locked ? "#9A9A9A" : CATEGORY_COLOR[category];
  const cardId = id || title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, selected }}
      disabled={locked}
      onPress={() => {
        if (!locked) onSelect?.(cardId);
      }}
      style={{
        backgroundColor: "#fff",
        borderColor: selected ? "#D71920" : `${color}33`,
        borderRadius: size === "lg" ? 20 : 16,
        borderWidth: selected ? 3 : rarity === "common" ? 1 : 2,
        height: dimensions.height,
        overflow: "hidden",
        padding: size === "sm" ? 14 : 18,
        width: dimensions.width,
      }}
    >
      <View
        style={{
          borderColor: `${color}24`,
          borderRadius: size === "lg" ? 16 : 12,
          borderWidth: 1,
          bottom: 8,
          left: 8,
          position: "absolute",
          right: 8,
          top: 8,
        }}
      />
      <View
        style={{
          backgroundColor: `${color}1F`,
          borderRadius: 999,
          height: 46,
          position: "absolute",
          right: 18,
          top: 26,
          width: 46,
        }}
      />
      <Text style={{ color: "rgba(23,23,23,0.48)", fontFamily: "monospace", fontSize: 10 }}>
        {typeof level === "number" ? `Lv.${level}` : category} · {rarity}
      </Text>
      <View style={{ flex: 1, justifyContent: "center", maxWidth: "78%" }}>
        <Text
          numberOfLines={1}
          style={{
            color: locked ? "rgba(23,23,23,0.46)" : "#161616",
            fontFamily: "serif",
            fontSize: size === "sm" ? 17 : 22,
            fontWeight: "700",
          }}
        >
          {title}
        </Text>
        {subtitle && size !== "sm" ? (
          <Text numberOfLines={1} style={{ color: "rgba(23,23,23,0.56)", fontFamily: "serif", fontSize: 12 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof progress === "number" ? (
        <View style={{ backgroundColor: "rgba(10,10,10,0.08)", height: 5, overflow: "hidden" }}>
          <View style={{ backgroundColor: color, height: "100%", width: `${clampProgress(progress)}%` as const }} />
        </View>
      ) : null}
      {locked && unlockHint ? (
        <Text numberOfLines={1} style={{ color: "rgba(23,23,23,0.46)", fontSize: 10 }}>
          {unlockHint}
        </Text>
      ) : null}
    </Pressable>
  );
}

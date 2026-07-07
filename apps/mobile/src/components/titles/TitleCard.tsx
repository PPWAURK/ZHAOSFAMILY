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

const CATEGORY_LABEL: Record<TitleCategory, string> = {
  growth: "成长",
  front: "前厅",
  kitchen: "后厨",
  management: "管理",
  fun: "趣味",
  premium: "尊享",
};

const RARITY_LABEL: Record<TitleRarity, string> = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

const SIZE_MAP: Record<TitleFrameSize, { width: number; height: number }> = {
  sm: { width: 160, height: 84 },
  md: { width: 220, height: 108 },
  lg: { width: 320, height: 152 },
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
        backgroundColor: locked ? "#f5f5f5" : "#ffffff",
        borderColor: selected ? color : locked ? "#e0e0e0" : `${color}40`,
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        height: dimensions.height,
        overflow: "hidden",
        width: dimensions.width,
      }}
    >
      <View
        style={{
          backgroundColor: color,
          height: "100%",
          left: 0,
          position: "absolute",
          top: 0,
          width: 4,
        }}
      />

      <View
        style={{
          flex: 1,
          gap: size === "sm" ? 2 : 4,
          justifyContent: "center",
          paddingHorizontal: size === "sm" ? 12 : 14,
          paddingLeft: size === "sm" ? 18 : 20,
          paddingVertical: size === "sm" ? 8 : 10,
        }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Text
            style={{
              color: locked ? "rgba(23,23,23,0.35)" : `${color}`,
              fontFamily: "monospace",
              fontSize: size === "sm" ? 8 : 9,
              fontWeight: "700",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {CATEGORY_LABEL[category]}
          </Text>
          <View
            style={{
              backgroundColor: locked ? "rgba(23,23,23,0.12)" : `${color}30`,
              borderRadius: 2,
              height: 3,
              width: 3,
            }}
          />
          <Text
            style={{
              color: locked ? "rgba(23,23,23,0.35)" : "rgba(23,23,23,0.5)",
              fontFamily: "monospace",
              fontSize: size === "sm" ? 8 : 9,
              fontWeight: "700",
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            {RARITY_LABEL[rarity]}
          </Text>
          {typeof level === "number" ? (
            <>
              <View
                style={{
                  backgroundColor: locked ? "rgba(23,23,23,0.12)" : `${color}30`,
                  borderRadius: 2,
                  height: 3,
                  width: 3,
                }}
              />
              <Text
                style={{
                  color: locked ? "rgba(23,23,23,0.35)" : "rgba(23,23,23,0.5)",
                  fontFamily: "monospace",
                  fontSize: size === "sm" ? 8 : 9,
                  fontWeight: "700",
                  letterSpacing: 0.6,
                }}
              >
                Lv.{level}
              </Text>
            </>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          style={{
            color: locked ? "rgba(23,23,23,0.4)" : "#161616",
            fontFamily: "serif",
            fontSize: size === "sm" ? 15 : size === "md" ? 18 : 22,
            fontWeight: "700",
            lineHeight: size === "sm" ? 20 : size === "md" ? 24 : 30,
          }}
        >
          {title}
        </Text>

        {subtitle && size !== "sm" ? (
          <Text
            numberOfLines={1}
            style={{
              color: "rgba(23,23,23,0.5)",
              fontFamily: "serif",
              fontSize: 11,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {typeof progress === "number" ? (
        <View
          style={{
            backgroundColor: locked ? "rgba(10,10,10,0.06)" : "rgba(10,10,10,0.08)",
            height: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: color,
              height: "100%",
              width: `${clampProgress(progress)}%` as const,
            }}
          />
        </View>
      ) : null}

      {locked && unlockHint ? (
        <View
          style={{
            alignItems: "center",
            backgroundColor: "rgba(10,10,10,0.04)",
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "rgba(23,23,23,0.4)",
              fontFamily: "monospace",
              fontSize: 8,
              fontWeight: "600",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {unlockHint}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

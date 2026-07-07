import { View } from "react-native";
import { TitleCard } from "@/components/titles";
import type { TrainingTitle } from "@/features/training/trainingTypes";
import type { TitleCategory, TitleIconType, TitleRarity } from "@/types/title";

type FramePalette = {
  ring: string;
  fill: string;
  ink: string;
};

// Avatar-frame / badge palettes keyed by the backend `frameStyle` value.
export const TITLE_FRAME_PALETTES: Record<string, FramePalette> = {
  red: { ring: "#c11616", fill: "rgba(193,22,22,0.08)", ink: "#c11616" },
  gold: { ring: "#b8860b", fill: "rgba(184,134,11,0.10)", ink: "#8a6508" },
  jade: { ring: "#1f7a5a", fill: "rgba(31,122,90,0.10)", ink: "#1f7a5a" },
};

export function getFramePalette(frameStyle: string): FramePalette {
  return TITLE_FRAME_PALETTES[frameStyle] ?? TITLE_FRAME_PALETTES.red;
}

type TrainingTitleFrameMeta = {
  category: TitleCategory;
  rarity: TitleRarity;
  iconType: TitleIconType;
};

function resolveTrainingTitleFrame(title: TrainingTitle): TrainingTitleFrameMeta {
  if (title.frameStyle === "gold") {
    return { category: "premium", rarity: "legendary", iconType: "prestige" };
  }

  if (title.frameStyle === "jade") {
    return { category: "kitchen", rarity: "rare", iconType: "cooking" };
  }

  if (title.unlockPositionCode === "FOH") {
    return { category: "front", rarity: "rare", iconType: "smile" };
  }

  if (title.unlockPositionCode === "BOH") {
    return { category: "kitchen", rarity: "rare", iconType: "cooking" };
  }

  return { category: "growth", rarity: "rare", iconType: "plant" };
}

export function TitleBadge({
  title,
  language,
}: {
  title: TrainingTitle;
  language: "zh" | "en" | "fr";
}) {
  const locked = !title.earned;
  const frame = resolveTrainingTitleFrame(title);

  return (
    <TitleCard
      id={title.code}
      title={title.name[language]}
      subtitle={title.earnedAt ? title.earnedAt.slice(0, 10) : undefined}
      category={frame.category}
      rarity={frame.rarity}
      iconType={frame.iconType}
      locked={locked}
      size="sm"
      progress={locked ? 35 : 100}
      unlockHint={title.unlockPositionCode}
    />
  );
}

// A square seal-style avatar frame that draws the earned title's border around it.
export function AvatarFrame({
  frameStyle,
  size,
  children,
}: {
  frameStyle: string | null;
  size: number;
  children: React.ReactNode;
}) {
  const palette = frameStyle ? getFramePalette(frameStyle) : null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: palette ? 3 : 0,
        borderColor: palette?.ring ?? "transparent",
        padding: palette ? 2 : 0,
        alignItems: "center",
        justifyContent: "center",
        transform: palette ? [{ rotate: "-2deg" }] : [],
      }}
    >
      {children}
    </View>
  );
}

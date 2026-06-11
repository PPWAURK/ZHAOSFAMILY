import { Text, View } from "react-native";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type { TrainingTitle } from "@/features/training/trainingTypes";

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

export function TitleBadge({
  title,
  language,
}: {
  title: TrainingTitle;
  language: "zh" | "en" | "fr";
}) {
  const palette = getFramePalette(title.frameStyle);
  const locked = !title.earned;

  return (
    <View
      style={[
        styles.titleBadge,
        {
          borderColor: locked ? "rgba(10,10,10,0.18)" : palette.ring,
          backgroundColor: locked ? "transparent" : palette.fill,
        },
      ]}
    >
      <View
        style={[
          styles.titleBadgeMedal,
          { borderColor: locked ? "rgba(10,10,10,0.25)" : palette.ring },
        ]}
      >
        <Text
          style={[
            styles.titleBadgeMedalText,
            { color: locked ? "rgba(10,10,10,0.35)" : palette.ink },
          ]}
        >
          {locked ? "🔒" : "★"}
        </Text>
      </View>
      <Text
        style={[
          styles.titleBadgeName,
          { color: locked ? "rgba(10,10,10,0.4)" : palette.ink },
        ]}
        numberOfLines={2}
      >
        {title.name[language]}
      </Text>
    </View>
  );
}

// A circular avatar wrapper that draws the earned title's frame around it.
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
        borderRadius: size / 2,
        borderWidth: palette ? 3 : 0,
        borderColor: palette?.ring ?? "transparent",
        padding: palette ? 2 : 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}

import { Image, StyleSheet, Text, View } from "react-native";
import { scaleStyles } from "@/lib/responsive";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import type { TrainingTitle } from "@/features/training/trainingTypes";
import zhaoSealSource from "../../../assets/title-frames/zhao-seal.png";

const TITLE_FRAME_COLORS: Record<
  string,
  { accent: string; background: string; inner: string }
> = {
  red: {
    accent: authControlStyles.colors.red,
    background: "rgba(193, 22, 22, 0.06)",
    inner: "rgba(193, 22, 22, 0.16)",
  },
  gold: {
    accent: "#8b6200",
    background: "#fff8dc",
    inner: "rgba(139, 98, 0, 0.18)",
  },
  ink: {
    accent: authControlStyles.colors.ink,
    background: "#f6f6f6",
    inner: "rgba(10, 10, 10, 0.14)",
  },
  jade: {
    accent: "#16715e",
    background: "#eefaf5",
    inner: "rgba(22, 113, 94, 0.18)",
  },
  blue: {
    accent: "#245a9a",
    background: "#eef5ff",
    inner: "rgba(36, 90, 154, 0.18)",
  },
  purple: {
    accent: "#7040a0",
    background: "#f8f1ff",
    inner: "rgba(112, 64, 160, 0.18)",
  },
};

function getTitleName(title: TrainingTitle, language: AuthLanguage): string {
  return title.name[language] || title.name.zh || title.code;
}

export function TrainingTitleFrame({
  title,
  language,
  compact = false,
}: {
  title: TrainingTitle;
  language: AuthLanguage;
  compact?: boolean;
}) {
  const colors = TITLE_FRAME_COLORS[title.frameStyle] || TITLE_FRAME_COLORS.red;

  return (
    <View
      style={[
        styles.frame,
        compact ? styles.frameCompact : null,
        {
          backgroundColor: colors.background,
          borderColor: colors.accent,
        },
      ]}
    >
      <Image source={zhaoSealSource} style={styles.seal} resizeMode="contain" />
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          compact ? styles.textCompact : null,
          { color: colors.accent },
        ]}
      >
        {getTitleName(title, language)}
      </Text>
      <Image source={zhaoSealSource} style={styles.seal} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create(scaleStyles({
  frame: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    minWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  frameCompact: {
    minHeight: 30,
    minWidth: 118,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  seal: {
    height: 18,
    width: 18,
  },
  text: {
    flexShrink: 1,
    fontFamily: "serif",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
    maxWidth: 180,
    textAlign: "center",
  },
  textCompact: {
    fontSize: 12,
    lineHeight: 15,
    maxWidth: 128,
  },
}));

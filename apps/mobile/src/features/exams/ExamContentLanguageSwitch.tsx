import { Pressable, Text, View } from "react-native";
import type { ExamContentLanguage } from "@zhao/utils";

import { examStyles as styles } from "@/features/exams/examStyles";

const OPTIONS: Array<{ value: ExamContentLanguage; label: string }> = [
  { value: "zh", label: "中文" },
  { value: "fr", label: "Français" },
];

type ExamContentLanguageSwitchProps = {
  label: string;
  value: ExamContentLanguage;
  onChange: (value: ExamContentLanguage) => void;
};

/** Questions exist in Chinese and French; the employee picks which one to read. */
export function ExamContentLanguageSwitch({
  label,
  value,
  onChange,
}: ExamContentLanguageSwitchProps) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.muted}>{label}</Text>
      {OPTIONS.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, isActive && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

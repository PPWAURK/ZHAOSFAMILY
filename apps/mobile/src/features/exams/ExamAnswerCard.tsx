import { Text, View } from "react-native";
import type { ExamAttemptQuestion } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import { FeedbackPressable } from "@/components/FeedbackPressable";
import type { ExamCopy } from "@/features/exams/examCopy";
import { examStyles as styles } from "@/features/exams/examStyles";

type ExamAnswerCardProps = {
  question: ExamAttemptQuestion;
  index: number;
  total: number;
  selectedKeys: readonly string[];
  language: ExamContentLanguage;
  copy: ExamCopy;
  isDisabled: boolean;
  onSelect: (key: string) => void;
};

/** Radio markers for single/true-false, square checkboxes for multiple choice. */
export function ExamAnswerCard({
  question,
  index,
  total,
  selectedKeys,
  language,
  copy,
  isDisabled,
  onSelect,
}: ExamAnswerCardProps) {
  const isMultiple = question.type === "multiple";
  return (
    <View style={styles.question}>
      <Text style={styles.questionHeader}>
        {copy.question(index + 1, total)} · {copy.types[question.type]}
      </Text>
      <Text style={styles.prompt}>
        {pickExamText(language, question.promptZh, question.promptFr)}
      </Text>
      {isMultiple ? <Text style={styles.muted}>{copy.multipleHint}</Text> : null}
      {question.options.map((option) => {
        const isChecked = selectedKeys.includes(option.key);
        return (
          <FeedbackPressable
            key={option.key}
            accessibilityRole={isMultiple ? "checkbox" : "radio"}
            accessibilityState={{ checked: isChecked, disabled: isDisabled }}
            disabled={isDisabled}
            onPress={() => onSelect(option.key)}
            style={[styles.option, isChecked && styles.optionSelected]}
          >
            <View
              style={[isMultiple ? styles.checkbox : styles.radio, isChecked && styles.markerOn]}
            />
            <Text style={styles.optionText}>{pickExamText(language, option.zh, option.fr)}</Text>
          </FeedbackPressable>
        );
      })}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";
import type { ExamAttemptQuestion } from "@zhao/types";
import { isExamQuestionAnswered, type ExamAnswerMap } from "@zhao/utils";

import type { ExamCopy } from "@/features/exams/examCopy";
import { examStyles as styles } from "@/features/exams/examStyles";

type ExamQuestionNavigatorProps = {
  questions: readonly ExamAttemptQuestion[];
  answers: ExamAnswerMap;
  currentIndex: number;
  copy: ExamCopy;
  onSelect: (index: number) => void;
};

/** Numbered grid: answered questions filled, the current one outlined in red. */
export function ExamQuestionNavigator({
  questions,
  answers,
  currentIndex,
  copy,
  onSelect,
}: ExamQuestionNavigatorProps) {
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.navigator}>
        {questions.map((question, i) => {
          const isAnswered = isExamQuestionAnswered(answers, question.id);
          return (
            <Pressable
              key={question.id}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1} · ${isAnswered ? copy.legend.answered : copy.legend.unanswered}`}
              accessibilityState={{ selected: i === currentIndex }}
              onPress={() => onSelect(i)}
              style={[
                styles.navItem,
                isAnswered && styles.navItemAnswered,
                i === currentIndex && styles.navItemCurrent,
              ]}
            >
              <Text style={[styles.navItemText, isAnswered && styles.navItemTextAnswered]}>
                {i + 1}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.navItemAnswered]} />
          <Text style={styles.muted}>{copy.legend.answered}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendSwatch} />
          <Text style={styles.muted}>{copy.legend.unanswered}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.navItemCurrent]} />
          <Text style={styles.muted}>{copy.legend.current}</Text>
        </View>
      </View>
    </View>
  );
}

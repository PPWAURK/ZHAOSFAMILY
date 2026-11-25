import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExamAttempt } from "@zhao/types";
import {
  examSectionCount,
  formatExamCountdown,
  pickExamText,
  type ExamContentLanguage,
} from "@zhao/utils";

import { FeedbackPressable } from "@/components/FeedbackPressable";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import type { ExamCopy } from "@/features/exams/examCopy";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";

type ExamBreakViewProps = {
  attempt: ExamAttempt;
  copy: ExamCopy;
  language: ExamContentLanguage;
  /** Milliseconds left on the break; 0 while waiting for the next section's questions. */
  breakRemaining: number | null;
  isStarting: boolean;
  error: string | null;
  onStart: () => void;
  onLeave: () => void;
};

/** Between two sections: the previous one is handed in, the next starts at the end of the countdown. */
export function ExamBreakView({
  attempt,
  copy,
  language,
  breakRemaining,
  isStarting,
  error,
  onStart,
  onLeave,
}: ExamBreakViewProps) {
  const confirm = useConfirm();
  const labels = copy.breakView;
  const total = examSectionCount(attempt);
  const next = attempt.sections?.[attempt.sectionIndex];
  const isWaiting = breakRemaining === 0;

  const startEarly = async () => {
    const isConfirmed = await confirm({
      title: labels.confirmTitle,
      message: labels.confirmMessage,
      confirmLabel: labels.confirmLabel,
      cancelLabel: labels.cancel,
    });
    if (isConfirmed) onStart();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FeedbackPressable accessibilityRole="button" onPress={onLeave} style={styles.linkButton}>
        <Ionicons name="chevron-back" size={16} color={examColors.red} />
        <Text style={styles.linkButtonText}>{copy.backToList}</Text>
      </FeedbackPressable>
      <Text style={styles.title}>{pickExamText(language, attempt.titleZh, attempt.titleFr)}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.passChip}>{labels.handedIn(attempt.sectionIndex)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.statLabel}>{labels.timeLeft}</Text>
        <Text style={styles.breakTimer} accessibilityLiveRegion="polite">
          {formatExamCountdown(breakRemaining ?? 0)}
        </Text>
        {isWaiting ? <Text style={styles.muted}>{labels.waiting}</Text> : null}
      </View>

      {next ? (
        <View style={styles.card}>
          <Text style={styles.statLabel}>{labels.next}</Text>
          <Text style={styles.cardTitle}>
            {copy.sectionLabel(
              attempt.sectionIndex + 1,
              total,
              pickExamText(language, next.titleZh, next.titleFr),
            )}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaChip}>{copy.questions(next.questionCount)}</Text>
            <Text style={styles.metaChip}>{copy.timeLimit(next.timeLimitMinutes)}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.notice}>{labels.hint}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FeedbackPressable
        accessibilityRole="button"
        disabled={isStarting || isWaiting}
        onPress={() => void startEarly()}
        style={[styles.primaryButton, (isStarting || isWaiting) && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>{isStarting ? labels.starting : labels.start}</Text>
      </FeedbackPressable>
      <Text style={styles.muted}>{copy.leaveMessage}</Text>
    </ScrollView>
  );
}

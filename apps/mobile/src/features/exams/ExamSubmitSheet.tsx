import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { formatExamCountdown } from "@zhao/utils";

import { FeedbackPressable } from "@/components/FeedbackPressable";
import type { ExamCopy } from "@/features/exams/examCopy";
import { examStyles as styles } from "@/features/exams/examStyles";

type ExamSubmitSheetProps = {
  isVisible: boolean;
  copy: ExamCopy;
  total: number;
  /** 1-based numbers of the questions without an answer. */
  unansweredNumbers: readonly number[];
  remainingMs: number | null;
  /** Handing in a non-last section of a sectioned paper: it cannot be reopened. */
  isSectionSubmit?: boolean;
  isSubmitting: boolean;
  error: string | null;
  onJump: (questionNumber: number) => void;
  onConfirm: () => void;
  onClose: () => void;
};

/** Bottom sheet shown before submitting: counts, empty questions as shortcuts, time left. */
export function ExamSubmitSheet({
  isVisible,
  copy,
  total,
  unansweredNumbers,
  remainingMs,
  isSectionSubmit = false,
  isSubmitting,
  error,
  onJump,
  onConfirm,
  onClose,
}: ExamSubmitSheetProps) {
  const labels = copy.review;
  const close = () => {
    if (!isSubmitting) onClose();
  };
  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.sheetBackdrop} onPress={close} accessibilityLabel={labels.back}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.sheetTitle} accessibilityRole="header">
            {labels.title}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{labels.answered}</Text>
              <Text style={styles.statValue}>
                {total - unansweredNumbers.length}/{total}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{labels.unanswered}</Text>
              <Text
                style={[styles.statValue, unansweredNumbers.length > 0 && styles.statValueUrgent]}
              >
                {unansweredNumbers.length}
              </Text>
            </View>
            {remainingMs !== null ? (
              <View style={styles.stat}>
                <Text style={styles.statLabel}>{labels.timeLeft}</Text>
                <Text style={styles.statValue}>{formatExamCountdown(remainingMs)}</Text>
              </View>
            ) : null}
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10 }}>
            {isSectionSubmit ? <Text style={styles.notice}>{labels.sectionNotice}</Text> : null}
            <Text style={styles.notice}>
              {unansweredNumbers.length ? labels.unansweredHint : labels.allAnswered}
            </Text>
            {unansweredNumbers.length ? (
              <View style={styles.navigator}>
                {unansweredNumbers.map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={() => onJump(n)}
                    style={styles.navItem}
                  >
                    <Text style={styles.navItemText}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.sheetActions}>
            <FeedbackPressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onConfirm}
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? copy.submitting
                  : isSectionSubmit
                    ? labels.confirmSection
                    : labels.confirm}
              </Text>
            </FeedbackPressable>
            <FeedbackPressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={close}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{labels.back}</Text>
            </FeedbackPressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { MyExamAttempt } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import { EmptyState, ErrorState } from "@/components/ContentState";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { fetchMyExamAttempts } from "@/features/exams/examApi";
import { describeExamError, type ExamCopy } from "@/features/exams/examCopy";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";

type ExamHistoryViewProps = {
  copy: ExamCopy;
  language: ExamContentLanguage;
  formatDate: (value: string) => string;
  onOpen: (attempt: MyExamAttempt) => void;
  onBack: () => void;
};

export function ExamHistoryView({
  copy,
  language,
  formatDate,
  onOpen,
  onBack,
}: ExamHistoryViewProps) {
  const historyQuery = useQuery({ queryKey: ["exams", "mine"], queryFn: fetchMyExamAttempts });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FeedbackPressable accessibilityRole="button" onPress={onBack} style={styles.linkButton}>
        <Ionicons name="chevron-back" size={16} color={examColors.red} />
        <Text style={styles.linkButtonText}>{copy.backToList}</Text>
      </FeedbackPressable>
      <Text style={styles.title}>{copy.history}</Text>
      {historyQuery.isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}
      {historyQuery.error ? (
        <ErrorState
          title={copy.loadError}
          description={describeExamError(historyQuery.error, copy)}
          actionLabel={copy.retry}
          onAction={() => void historyQuery.refetch()}
        />
      ) : null}
      {historyQuery.data?.length === 0 ? (
        <EmptyState title={copy.noHistory} description={copy.subtitle} />
      ) : null}
      {historyQuery.data?.map((row) => (
        <FeedbackPressable
          key={row.id}
          accessibilityRole="button"
          onPress={() => onOpen(row)}
          style={styles.historyRow}
        >
          <Text style={styles.historyTitle}>
            {pickExamText(language, row.titleZh, row.titleFr)}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaChip}>{copy.statuses[row.status]}</Text>
            {row.score !== null ? <Text style={styles.metaChip}>{row.score}</Text> : null}
            {row.passed !== null ? (
              <Text style={row.passed ? styles.passChip : styles.failChip}>
                {row.passed ? copy.result.pass : copy.result.fail}
              </Text>
            ) : null}
            <Text style={styles.muted}>{formatDate(row.submittedAt ?? row.startedAt)}</Text>
          </View>
          <Text style={styles.linkButtonText}>
            {row.status === "IN_PROGRESS" ? copy.resume : copy.view}
          </Text>
        </FeedbackPressable>
      ))}
    </ScrollView>
  );
}

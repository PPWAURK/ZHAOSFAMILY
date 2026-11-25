import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ExamAttempt, ExamCard } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import { EmptyState, ErrorState } from "@/components/ContentState";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { fetchAvailableExams, startExamAttempt } from "@/features/exams/examApi";
import { ExamJoinCard } from "@/features/exams/ExamJoinCard";
import { MyExamSessionsCard } from "@/features/exams/MyExamSessionsCard";
import { describeExamError, type ExamCopy } from "@/features/exams/examCopy";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";

export const EXAM_LIST_QUERY_KEY = ["exams", "available"] as const;

export function isOutOfAttempts(exam: ExamCard): boolean {
  return (
    exam.inProgressAttemptId === null &&
    exam.maxAttempts !== null &&
    exam.attemptsUsed >= exam.maxAttempts
  );
}

type ExamListViewProps = {
  isActive: boolean;
  copy: ExamCopy;
  language: ExamContentLanguage;
  onStarted: (attempt: ExamAttempt) => void;
  onOpenHistory: () => void;
};

function ExamCardItem({
  exam,
  copy,
  language,
  isStarting,
  onStart,
}: {
  exam: ExamCard;
  copy: ExamCopy;
  language: ExamContentLanguage;
  isStarting: boolean;
  onStart: () => void;
}) {
  const isBlocked = isOutOfAttempts(exam);
  const description = pickExamText(language, exam.descriptionZh, exam.descriptionFr);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{pickExamText(language, exam.titleZh, exam.titleFr)}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      <View style={styles.metaRow}>
        <Text style={styles.metaChip}>{copy.questions(exam.questionCount)}</Text>
        {exam.sectionCount > 1 ? (
          <Text style={styles.metaChip}>{copy.sections(exam.sectionCount)}</Text>
        ) : null}
        <Text style={styles.metaChip}>{copy.timeLimit(exam.timeLimitMinutes)}</Text>
        <Text style={styles.metaChip}>{copy.passing(exam.passingScore)}</Text>
        <Text style={styles.metaChip}>{copy.attempts(exam.attemptsUsed, exam.maxAttempts)}</Text>
        {exam.bestScore !== null ? (
          <Text style={styles.metaChip}>{copy.bestScore(exam.bestScore)}</Text>
        ) : null}
        {exam.hasPassed ? <Text style={styles.passChip}>{copy.passed}</Text> : null}
      </View>
      <FeedbackPressable
        accessibilityRole="button"
        disabled={isBlocked || isStarting}
        onPress={onStart}
        style={[styles.primaryButton, (isBlocked || isStarting) && styles.buttonDisabled]}
      >
        <Text style={styles.primaryButtonText}>
          {isBlocked ? copy.noAttemptsLeft : exam.inProgressAttemptId ? copy.resume : copy.start}
        </Text>
      </FeedbackPressable>
    </View>
  );
}

export function ExamListView({
  isActive,
  copy,
  language,
  onStarted,
  onOpenHistory,
}: ExamListViewProps) {
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const examsQuery = useQuery({
    queryKey: EXAM_LIST_QUERY_KEY,
    queryFn: fetchAvailableExams,
    enabled: isActive,
  });

  const start = async (templateId: number) => {
    setStartingId(templateId);
    setError(null);
    try {
      onStarted(await startExamAttempt(templateId));
    } catch (reason) {
      setError(describeExamError(reason, copy));
    } finally {
      setStartingId(null);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={examsQuery.isRefetching}
          onRefresh={() => void examsQuery.refetch()}
        />
      }
    >
      <Text style={styles.kicker}>{copy.kicker}</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>
      <ExamJoinCard copy={copy} onJoined={onStarted} />
      <MyExamSessionsCard isActive={isActive} copy={copy} language={language} />
      <FeedbackPressable
        accessibilityRole="button"
        onPress={onOpenHistory}
        style={styles.linkButton}
      >
        <Text style={styles.linkButtonText}>{copy.history}</Text>
        <Ionicons name="chevron-forward" size={16} color={examColors.red} />
      </FeedbackPressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {examsQuery.isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}
      {examsQuery.error ? (
        <ErrorState
          title={copy.loadError}
          description={describeExamError(examsQuery.error, copy)}
          actionLabel={copy.retry}
          onAction={() => void examsQuery.refetch()}
        />
      ) : null}
      {examsQuery.data?.length === 0 ? (
        <EmptyState title={copy.noExams} description={copy.noExamsDetail} />
      ) : null}
      {examsQuery.data?.map((exam) => (
        <ExamCardItem
          key={exam.templateId}
          exam={exam}
          copy={copy}
          language={language}
          isStarting={startingId === exam.templateId}
          onStart={() => void start(exam.templateId)}
        />
      ))}
    </ScrollView>
  );
}

import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ExamAttemptResultItem } from "@zhao/types";
import { pickExamText, type ExamContentLanguage } from "@zhao/utils";

import { ErrorState } from "@/components/ContentState";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { fetchExamAttempt } from "@/features/exams/examApi";
import { ExamContentLanguageSwitch } from "@/features/exams/ExamContentLanguageSwitch";
import { ExamResultBreakdown } from "@/features/exams/ExamResultBreakdown";
import { describeExamError, type ExamCopy } from "@/features/exams/examCopy";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";

type ExamResultViewProps = {
  attemptId: number;
  copy: ExamCopy;
  defaultLanguage: ExamContentLanguage;
  onBack: () => void;
};

function optionStyle(key: string, item: ExamAttemptResultItem, showDetails: boolean) {
  if (showDetails && item.correctKeys.includes(key)) return styles.optionCorrect;
  if (!item.selectedKeys.includes(key)) return null;
  return showDetails ? styles.optionWrong : styles.optionSelected;
}

function ResultItem({
  item,
  index,
  language,
  copy,
  showDetails,
}: {
  item: ExamAttemptResultItem;
  index: number;
  language: ExamContentLanguage;
  copy: ExamCopy;
  showDetails: boolean;
}) {
  const explanation = pickExamText(language, item.explanationZh, item.explanationFr);
  return (
    <View style={styles.question}>
      <View style={styles.metaRow}>
        <Text style={styles.questionHeader}>
          #{index + 1} · {copy.types[item.type]}
        </Text>
        <Text style={item.isCorrect ? styles.passChip : styles.failChip}>
          {item.isCorrect ? "✓" : "✗"}
        </Text>
      </View>
      <Text style={styles.prompt}>{pickExamText(language, item.promptZh, item.promptFr)}</Text>
      {item.options.map((option) => (
        <View key={option.key} style={[styles.option, optionStyle(option.key, item, showDetails)]}>
          <Text style={styles.optionText}>{pickExamText(language, option.zh, option.fr)}</Text>
        </View>
      ))}
      {!item.selectedKeys.length ? <Text style={styles.muted}>{copy.result.noAnswer}</Text> : null}
      {showDetails && explanation ? (
        <Text style={styles.explanation}>
          {copy.result.explanation}: {explanation}
        </Text>
      ) : null}
    </View>
  );
}

/** Score summary and every graded question, with answers when the exam publishes them. */
export function ExamResultView({ attemptId, copy, defaultLanguage, onBack }: ExamResultViewProps) {
  const [language, setLanguage] = useState<ExamContentLanguage>(defaultLanguage);
  const attemptQuery = useQuery({
    queryKey: ["exams", "attempt", attemptId],
    queryFn: () => fetchExamAttempt(attemptId),
  });
  const attempt = attemptQuery.data;
  const result = attempt?.result;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <FeedbackPressable accessibilityRole="button" onPress={onBack} style={styles.linkButton}>
        <Ionicons name="chevron-back" size={16} color={examColors.red} />
        <Text style={styles.linkButtonText}>{copy.backToList}</Text>
      </FeedbackPressable>
      {attemptQuery.isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}
      {attemptQuery.error ? (
        <ErrorState
          title={copy.loadError}
          description={describeExamError(attemptQuery.error, copy)}
          actionLabel={copy.retry}
          onAction={() => void attemptQuery.refetch()}
        />
      ) : null}
      {attempt && result ? (
        <>
          <Text style={styles.title}>
            {pickExamText(language, attempt.titleZh, attempt.titleFr)}
          </Text>
          <View style={styles.scoreRow}>
            <Text style={styles.score}>{result.score}</Text>
            <Text style={result.passed ? styles.passChip : styles.failChip}>
              {result.passed ? copy.result.pass : copy.result.fail}
            </Text>
            <Text style={styles.muted}>
              {copy.result.correctCount(result.correctCount, attempt.totalCount)}
            </Text>
            <Text style={styles.muted}>{copy.passing(attempt.passingScore)}</Text>
          </View>
          <ExamResultBreakdown
            score={result.score}
            passingScore={attempt.passingScore}
            passed={result.passed}
            sections={result.sections}
            rules={result.rules ?? []}
            copy={copy}
            language={language}
          />
          {attempt.status === "EXPIRED" ? (
            <Text style={styles.notice}>{copy.result.expired}</Text>
          ) : null}
          {!result.showExplanations ? (
            <Text style={styles.notice}>{copy.result.hidden}</Text>
          ) : null}
          <ExamContentLanguageSwitch
            label={copy.contentLanguage}
            value={language}
            onChange={setLanguage}
          />
          {result.items.map((item, index) => (
            <ResultItem
              key={item.id}
              item={item}
              index={index}
              language={language}
              copy={copy}
              showDetails={result.showExplanations}
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

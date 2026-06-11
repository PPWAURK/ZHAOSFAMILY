import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TitleBadge } from "@/features/training/TitleBadge";
import {
  fetchTrainingQuiz,
  submitTrainingQuiz,
} from "@/features/training/trainingApi";
import type { TRAINING_COPY } from "@/features/training/trainingCopy";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type {
  TrainingQuiz,
  TrainingQuizAttemptResult,
  TrainingQuizQuestion,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingQuizModalProps = {
  copy: TrainingCopySet;
  language: "zh" | "en" | "fr";
  materialId: number | null;
  onClose: () => void;
  onPassed: () => void;
};

type Phase = "loading" | "taking" | "result" | "error";

function toggleSelection(
  current: string[],
  key: string,
  isMultiple: boolean,
): string[] {
  if (isMultiple) {
    return current.includes(key)
      ? current.filter((value) => value !== key)
      : [...current, key];
  }

  return current.includes(key) ? [] : [key];
}

function QuestionBlock({
  copy,
  question,
  index,
  selectedKeys,
  result,
  onSelect,
}: {
  copy: TrainingCopySet;
  question: TrainingQuizQuestion;
  index: number;
  selectedKeys: string[];
  result: TrainingQuizAttemptResult["results"][number] | undefined;
  onSelect: (key: string) => void;
}) {
  const isMultiple = question.type === "multiple";
  const locked = Boolean(result);

  return (
    <View style={styles.quizQuestion}>
      <Text style={styles.quizPrompt}>
        {index + 1}. {question.prompt}
        {isMultiple ? `  (${copy.quizMultipleHint})` : ""}
      </Text>
      {question.options.map((option) => {
        const selected = selectedKeys.includes(option.key);
        const isCorrectKey = result?.correctKeys.includes(option.key) ?? false;
        const showCorrect = locked && isCorrectKey;
        const showWrong = locked && selected && !isCorrectKey;

        return (
          <Pressable
            key={option.key}
            disabled={locked}
            style={[
              styles.quizOption,
              selected ? styles.quizOptionSelected : null,
              showCorrect ? styles.quizOptionCorrect : null,
              showWrong ? styles.quizOptionWrong : null,
            ]}
            onPress={() => onSelect(option.key)}
          >
            <View
              style={[
                isMultiple ? styles.quizCheckbox : styles.quizRadio,
                selected ? styles.quizMarkSelected : null,
              ]}
            />
            <Text style={styles.quizOptionLabel}>{option.label}</Text>
          </Pressable>
        );
      })}
      {locked && result?.explanation ? (
        <Text style={styles.quizExplanation}>
          {result.correct ? "✓ " : "✕ "}
          {result.explanation}
        </Text>
      ) : null}
    </View>
  );
}

export function TrainingQuizModal({
  copy,
  language,
  materialId,
  onClose,
  onPassed,
}: TrainingQuizModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [quiz, setQuiz] = useState<TrainingQuiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [result, setResult] = useState<TrainingQuizAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadQuiz = useCallback(async (): Promise<void> => {
    if (materialId === null) return;

    setPhase("loading");
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setErrorMessage("");

    try {
      const nextQuiz = await fetchTrainingQuiz(materialId);
      setQuiz(nextQuiz);
      setPhase("taking");
    } catch {
      setErrorMessage(copy.quizLoadError);
      setPhase("error");
    }
  }, [materialId, copy.quizLoadError]);

  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  const resultByQuestion = new Map(
    (result?.results ?? []).map((item) => [item.questionId, item]),
  );
  const allAnswered = Boolean(
    quiz &&
      quiz.questions.every(
        (question) => (answers[question.id] ?? []).length > 0,
      ),
  );
  const attemptsLeft =
    quiz && quiz.maxAttempts !== null
      ? Math.max(quiz.maxAttempts - (result?.attemptsUsed ?? quiz.attemptsUsed), 0)
      : null;
  const canRetake =
    !result?.passed && (attemptsLeft === null || attemptsLeft > 0);

  async function handleSubmit(): Promise<void> {
    if (!quiz || !allAnswered || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = quiz.questions.map((question) => ({
        questionId: question.id,
        selectedKeys: answers[question.id] ?? [],
      }));
      const attempt = await submitTrainingQuiz(quiz.materialId, payload);
      setResult(attempt);
      setPhase("result");

      if (attempt.passed) onPassed();
    } catch {
      setErrorMessage(copy.quizSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelect(questionId: number, key: string, isMultiple: boolean): void {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: toggleSelection(previous[questionId] ?? [], key, isMultiple),
    }));
  }

  return (
    <Modal
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      visible={materialId !== null}
      onRequestClose={onClose}
    >
      <View style={styles.previewModalRoot}>
        <SafeAreaView edges={["bottom"]} style={styles.previewPanel}>
          <View style={styles.previewHeader}>
            <View style={styles.previewTitleGroup}>
              <Text style={styles.cardMeta}>{copy.quizKicker}</Text>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {quiz?.materialTitle || copy.quiz}
              </Text>
            </View>
            <Pressable style={styles.previewCloseButton} onPress={onClose}>
              <Text style={styles.refreshButtonText}>{copy.close}</Text>
            </Pressable>
          </View>

          {phase === "loading" ? (
            <View style={styles.previewBody}>
              <ZhaoLoadingIndicator label={copy.quizLoading} variant="overlay" />
            </View>
          ) : null}

          {phase === "error" ? (
            <View style={styles.quizCenter}>
              <Text style={styles.message}>{errorMessage}</Text>
              <Pressable style={styles.refreshButton} onPress={() => void loadQuiz()}>
                <Text style={styles.refreshButtonText}>{copy.retry}</Text>
              </Pressable>
            </View>
          ) : null}

          {quiz && (phase === "taking" || phase === "result") ? (
            <>
              <ScrollView
                contentContainerStyle={styles.quizScroll}
                showsVerticalScrollIndicator={false}
              >
                {result ? (
                  <View
                    style={[
                      styles.quizScoreCard,
                      result.passed
                        ? styles.quizScorePass
                        : styles.quizScoreFail,
                    ]}
                  >
                    <Text style={styles.quizScoreValue}>{result.score}%</Text>
                    <Text style={styles.quizScoreLabel}>
                      {result.passed ? copy.quizPassed : copy.quizFailed} ·{" "}
                      {copy.quizPassMark}
                      {quiz.passingScore}%
                    </Text>
                    {result.newTitles.length > 0 ? (
                      <View style={styles.quizTitlesUnlocked}>
                        <Text style={styles.quizUnlockLabel}>
                          {copy.quizTitleUnlocked}
                        </Text>
                        <View style={styles.titleBadgeRow}>
                          {result.newTitles.map((title) => (
                            <TitleBadge
                              key={title.code}
                              title={title}
                              language={language}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.quizIntro}>
                    {copy.quizIntro}
                    {quiz.maxAttempts !== null
                      ? ` ${copy.quizAttempts}: ${quiz.attemptsUsed}/${quiz.maxAttempts}`
                      : ""}
                  </Text>
                )}

                {quiz.questions.map((question, index) => (
                  <QuestionBlock
                    key={question.id}
                    copy={copy}
                    question={question}
                    index={index}
                    selectedKeys={answers[question.id] ?? []}
                    result={resultByQuestion.get(question.id)}
                    onSelect={(key) =>
                      handleSelect(question.id, key, question.type === "multiple")
                    }
                  />
                ))}
              </ScrollView>

              <View style={styles.previewFooter}>
                {!result ? (
                  <>
                    <Pressable
                      disabled={!allAnswered || isSubmitting}
                      style={[
                        styles.markCompleteButton,
                        !allAnswered || isSubmitting
                          ? styles.markCompleteButtonDisabled
                          : null,
                      ]}
                      onPress={() => void handleSubmit()}
                    >
                      <Text style={styles.markCompleteButtonText}>
                        {isSubmitting ? copy.quizSubmitting : copy.quizSubmit}
                      </Text>
                    </Pressable>
                    {!allAnswered ? (
                      <Text style={styles.markCompleteHint}>
                        {copy.quizAnswerAllHint}
                      </Text>
                    ) : null}
                    {errorMessage ? (
                      <Text style={styles.syncFailedText}>{errorMessage}</Text>
                    ) : null}
                  </>
                ) : result.passed ? (
                  <Pressable style={styles.markCompleteButton} onPress={onClose}>
                    <Text style={styles.markCompleteButtonText}>{copy.quizDone}</Text>
                  </Pressable>
                ) : canRetake ? (
                  <Pressable
                    style={styles.markCompleteButton}
                    onPress={() => void loadQuiz()}
                  >
                    <Text style={styles.markCompleteButtonText}>
                      {copy.quizRetake}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Text style={styles.markCompleteHint}>
                      {copy.quizNoAttemptsLeft}
                    </Text>
                    <Pressable style={styles.previewCloseButton} onPress={onClose}>
                      <Text style={styles.refreshButtonText}>{copy.close}</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

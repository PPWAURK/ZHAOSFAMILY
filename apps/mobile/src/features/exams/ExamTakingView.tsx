import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ExamAttempt } from "@zhao/types";
import {
  examSectionCount,
  formatExamCountdown,
  isLastExamSection,
  pickExamText,
  unansweredExamNumbers,
  type ExamContentLanguage,
} from "@zhao/utils";

import { ErrorState } from "@/components/ContentState";
import { FeedbackPressable } from "@/components/FeedbackPressable";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { ExamAnswerCard } from "@/features/exams/ExamAnswerCard";
import { ExamBreakView } from "@/features/exams/ExamBreakView";
import { describeExamError, type ExamCopy } from "@/features/exams/examCopy";
import { ExamContentLanguageSwitch } from "@/features/exams/ExamContentLanguageSwitch";
import { ExamQuestionNavigator } from "@/features/exams/ExamQuestionNavigator";
import { examColors, examStyles as styles } from "@/features/exams/examStyles";
import { ExamSubmitSheet } from "@/features/exams/ExamSubmitSheet";
import { useExamSession } from "@/features/exams/useExamSession";
import { useScreenName } from "@/lib/useScreenName";

const URGENT_MS = 60_000;

/** 「第 1/2 场 · 上场：管理制度」; null for a single-section paper. */
function sectionHeading(
  attempt: ExamAttempt,
  copy: ExamCopy,
  language: ExamContentLanguage,
): string | null {
  const section = attempt.sections?.[attempt.sectionIndex];
  if (!section) return null;
  const title = pickExamText(language, section.titleZh, section.titleFr);
  return copy.sectionLabel(attempt.sectionIndex + 1, examSectionCount(attempt), title);
}

type ExamTakingViewProps = {
  attemptId: number;
  copy: ExamCopy;
  defaultLanguage: ExamContentLanguage;
  onFinished: (attempt: ExamAttempt) => void;
  onLeave: () => void;
};

export function ExamTakingView({
  attemptId,
  copy,
  defaultLanguage,
  onFinished,
  onLeave,
}: ExamTakingViewProps) {
  useScreenName("exam-taking");
  const confirm = useConfirm();
  const scrollRef = useRef<ScrollView | null>(null);
  const [language, setLanguage] = useState<ExamContentLanguage>(defaultLanguage);
  // Position and open sheet belong to one section: a new section starts at
  // question 1 with the sheet closed.
  const [position, setPosition] = useState({ section: 0, index: 0 });
  const [reviewSection, setReviewSection] = useState<number | null>(null);
  const session = useExamSession(attemptId, onFinished);
  const attempt = session.attempt;
  const sectionIndex = attempt?.sectionIndex ?? 0;
  const index = position.section === sectionIndex ? position.index : 0;
  const isReviewOpen = reviewSection === sectionIndex;
  const setIsReviewOpen = (isOpen: boolean) => setReviewSection(isOpen ? sectionIndex : null);
  const questions = attempt?.questions ?? [];
  const question = questions[index];
  const isLast = index >= questions.length - 1;
  const unansweredNumbers = unansweredExamNumbers(
    questions.map((q) => q.id),
    session.answers,
  );
  const submitError = session.submitError ? describeExamError(session.submitError, copy) : null;

  const goTo = (nextIndex: number) => {
    setPosition({ section: sectionIndex, index: nextIndex });
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  };
  const leave = async () => {
    const isConfirmed = await confirm({
      title: copy.leaveTitle,
      message: copy.leaveMessage,
      confirmLabel: copy.leaveConfirm,
      cancelLabel: copy.stay,
    });
    if (isConfirmed) onLeave();
  };

  if (session.loadError) {
    return (
      <ErrorState
        title={copy.loadError}
        description={describeExamError(session.loadError, copy)}
        actionLabel={copy.retry}
        onAction={session.reload}
      />
    );
  }
  if (attempt && session.isOnBreak) {
    const breakError = session.startError ?? session.syncError;
    return (
      <ExamBreakView
        attempt={attempt}
        copy={copy}
        language={language}
        breakRemaining={session.breakRemaining}
        isStarting={session.isStartingSection}
        error={breakError ? describeExamError(breakError, copy) : null}
        onStart={() => void session.startNextSection()}
        onLeave={() => void leave()}
      />
    );
  }
  if (!attempt || !question) {
    return <ZhaoLoadingIndicator label={copy.loading} />;
  }
  const heading = sectionHeading(attempt, copy, language);

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <FeedbackPressable
        accessibilityRole="button"
        onPress={() => void leave()}
        style={styles.linkButton}
      >
        <Ionicons name="chevron-back" size={16} color={examColors.red} />
        <Text style={styles.linkButtonText}>{copy.backToList}</Text>
      </FeedbackPressable>
      <Text style={styles.title}>{pickExamText(language, attempt.titleZh, attempt.titleFr)}</Text>
      {heading ? <Text style={styles.sectionLabel}>{heading}</Text> : null}

      <View style={styles.examBar}>
        <View style={styles.examBarInfo}>
          {session.remaining !== null ? (
            <Text
              style={[styles.timer, session.remaining < URGENT_MS && styles.timerUrgent]}
              accessibilityLiveRegion="polite"
            >
              {copy.timeLeft} {formatExamCountdown(session.remaining)}
            </Text>
          ) : null}
          <Text style={styles.progressText}>
            {copy.progress(questions.length - unansweredNumbers.length, questions.length)}
            {session.savedAt ? ` · ${copy.saved}` : ""}
          </Text>
        </View>
        <FeedbackPressable
          accessibilityRole="button"
          disabled={session.isSubmitting}
          onPress={() => setIsReviewOpen(true)}
          style={styles.smallButton}
        >
          <Text style={styles.smallButtonText}>
            {session.isSubmitting ? copy.submitting : copy.submit}
          </Text>
        </FeedbackPressable>
      </View>

      {submitError && !isReviewOpen ? <Text style={styles.error}>{submitError}</Text> : null}
      <ExamContentLanguageSwitch
        label={copy.contentLanguage}
        value={language}
        onChange={setLanguage}
      />
      <ExamQuestionNavigator
        questions={questions}
        answers={session.answers}
        currentIndex={index}
        copy={copy}
        onSelect={goTo}
      />
      <ExamAnswerCard
        question={question}
        index={index}
        total={questions.length}
        selectedKeys={session.answers[question.id] ?? []}
        language={language}
        copy={copy}
        isDisabled={session.isSubmitting}
        onSelect={(key) => session.select(question.id, question.type, key)}
      />

      <View style={styles.questionNav}>
        <FeedbackPressable
          accessibilityRole="button"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
          style={[
            styles.secondaryButton,
            styles.questionNavButton,
            index === 0 && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>{copy.previous}</Text>
        </FeedbackPressable>
        <FeedbackPressable
          accessibilityRole="button"
          disabled={isLast && session.isSubmitting}
          onPress={() => (isLast ? setIsReviewOpen(true) : goTo(index + 1))}
          style={[styles.primaryButton, styles.questionNavButton]}
        >
          <Text style={styles.primaryButtonText}>{isLast ? copy.reviewAndSubmit : copy.next}</Text>
        </FeedbackPressable>
      </View>
      <Text style={styles.muted}>{copy.leaveMessage}</Text>

      <ExamSubmitSheet
        isVisible={isReviewOpen}
        copy={copy}
        total={questions.length}
        unansweredNumbers={unansweredNumbers}
        remainingMs={session.remaining}
        isSectionSubmit={!isLastExamSection(attempt)}
        isSubmitting={session.isSubmitting}
        error={submitError}
        onJump={(n) => {
          setIsReviewOpen(false);
          goTo(n - 1);
        }}
        onConfirm={() => void session.submit()}
        onClose={() => setIsReviewOpen(false)}
      />
    </ScrollView>
  );
}

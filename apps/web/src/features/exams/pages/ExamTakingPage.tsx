"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import type { ExamAttempt } from "@zhao/types";
import { examSectionCount, isLastExamSection } from "@zhao/utils";

import AnswerQuestionCard from "../components/AnswerQuestionCard";
import ContentLanguageSwitch from "../components/ContentLanguageSwitch";
import ExamShell from "../components/ExamShell";
import QuestionNavigator from "../components/QuestionNavigator";
import SectionBreakView from "../components/SectionBreakView";
import SubmitReviewModal from "../components/SubmitReviewModal";
import { EXAM_COPY, type ExamCopy } from "../constants/exam-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import {
  defaultContentLanguage,
  pickText,
  type ExamContentLanguage,
} from "../constants/exam-languages";
import styles from "../exams.module.css";
import planStyles from "../examPlan.module.css";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { useExamSession } from "../hooks/useExamSession";
import { formatCountdown } from "../utils/examTimer";

const URGENT_MS = 60_000;

/** 「第 1/2 场 · 上场：管理制度」, or null for a single-section paper. */
function sectionHeader(
  attempt: ExamAttempt,
  copy: ExamCopy,
  language: ExamContentLanguage,
): string | null {
  const section = attempt.sections?.[attempt.sectionIndex];
  if (!section) return null;
  const title = pickText(language, section.titleZh, section.titleFr);
  return copy.section.header(attempt.sectionIndex + 1, examSectionCount(attempt), title);
}

export default function ExamTakingPage() {
  const router = useRouter();
  const attemptId = Number(useSearchParams().get("attemptId"));
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_COPY[lang];
  const [contentLanguage, setContentLanguage] = useState<ExamContentLanguage | null>(null);
  const [index, setIndex] = useState(0);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const showResult = useCallback(
    (attempt: ExamAttempt) => router.replace(`/dashboard/exams/result?attemptId=${attempt.id}`),
    [router],
  );
  const session = useExamSession(attemptId, showResult);
  const attempt = session.attempt;
  const sectionBreak = session.sectionBreak;

  // Navigation is per section: a new section starts at its question 1, review closed.
  const sectionIndex = attempt?.sectionIndex ?? 0;
  const [shownSection, setShownSection] = useState(sectionIndex);
  if (shownSection !== sectionIndex) {
    setShownSection(sectionIndex);
    setIndex(0);
    setIsReviewOpen(false);
  }

  const questions = attempt?.questions ?? [];
  const language = contentLanguage ?? defaultContentLanguage(lang);
  const question = questions[index];
  const isLast = index >= questions.length - 1;
  const isFinalSection = attempt?.sections ? isLastExamSection(attempt) : true;
  const submitLabel = isFinalSection ? copy.submit : copy.section.submit;
  const unansweredNumbers = questions.flatMap((q, i) =>
    session.answers[q.id]?.length ? [] : [i + 1],
  );
  const title = attempt ? pickText(language, attempt.titleZh, attempt.titleFr) : copy.title;
  const header = attempt ? sectionHeader(attempt, copy, language) : null;
  const submitError = session.submitError ? describeExamError(session.submitError, lang) : null;

  const jumpTo = (questionNumber: number) => {
    setIndex(questionNumber - 1);
    setIsReviewOpen(false);
  };

  return (
    <ExamShell lang={lang} onLanguageChange={setLang} kicker={copy.kicker} title={title}>
      {!attempt && !session.loadError ? <p className={styles.muted}>{copy.loading}</p> : null}
      {session.loadError ? (
        <p className={styles.error}>{describeExamError(session.loadError, lang)}</p>
      ) : null}
      {attempt && sectionBreak.isOnBreak ? (
        <SectionBreakView
          attempt={attempt}
          copy={copy}
          language={language}
          breakRemaining={sectionBreak.breakRemaining}
          isStarting={sectionBreak.isStarting}
          error={sectionBreak.error ? describeExamError(sectionBreak.error, lang) : null}
          onStart={() => void sectionBreak.startNextSection()}
        />
      ) : null}
      {attempt && question && !sectionBreak.isOnBreak ? (
        <>
          {header ? <p className={planStyles.sectionHeader}>{header}</p> : null}
          <div className={styles.examBar}>
            <div className={styles.actions}>
              {session.remaining !== null ? (
                <span
                  className={`${styles.timer} ${session.remaining < URGENT_MS ? styles.timerUrgent : ""}`}
                  aria-live="polite"
                >
                  {copy.timeLeft} {formatCountdown(session.remaining)}
                </span>
              ) : null}
              <span className={styles.progressText}>
                {copy.progress(questions.length - unansweredNumbers.length, questions.length)}
              </span>
              {session.savedAt ? <span className={styles.muted}>{copy.saved}</span> : null}
            </div>
            <button
              type="button"
              className={styles.buttonPrimary}
              disabled={session.isSubmitting}
              onClick={() => setIsReviewOpen(true)}
            >
              {session.isSubmitting ? copy.submitting : submitLabel}
            </button>
          </div>
          {submitError && !isReviewOpen ? <p className={styles.error}>{submitError}</p> : null}
          <ContentLanguageSwitch
            label={copy.contentLanguage}
            value={language}
            onChange={setContentLanguage}
          />
          <QuestionNavigator
            questions={questions}
            answers={session.answers}
            currentIndex={index}
            copy={copy}
            onSelect={setIndex}
          />
          <AnswerQuestionCard
            question={question}
            index={index}
            total={questions.length}
            selectedKeys={session.answers[question.id] ?? []}
            language={language}
            copy={copy}
            isDisabled={session.isSubmitting}
            onSelect={(key) => session.select(question.id, question.type, key)}
          />
          <div className={styles.questionNav}>
            <button
              type="button"
              className={styles.button}
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              {copy.previous}
            </button>
            {isLast ? (
              <button
                type="button"
                className={styles.buttonPrimary}
                disabled={session.isSubmitting}
                onClick={() => setIsReviewOpen(true)}
              >
                {isFinalSection ? copy.reviewAndSubmit : copy.section.reviewAndSubmit}
              </button>
            ) : (
              <button
                type="button"
                className={styles.buttonPrimary}
                onClick={() => setIndex(index + 1)}
              >
                {copy.next}
              </button>
            )}
          </div>
          <p className={styles.muted}>{copy.leaveWarning}</p>
          {isReviewOpen ? (
            <SubmitReviewModal
              copy={copy}
              total={questions.length}
              unansweredNumbers={unansweredNumbers}
              remainingMs={session.remaining}
              isSubmitting={session.isSubmitting}
              error={submitError}
              sectionNotice={isFinalSection ? null : copy.section.notice}
              confirmLabel={isFinalSection ? undefined : copy.section.confirm}
              onJump={jumpTo}
              onConfirm={() => void session.submit()}
              onClose={() => setIsReviewOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </ExamShell>
  );
}

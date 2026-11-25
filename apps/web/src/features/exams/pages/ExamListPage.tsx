"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExamCard } from "@zhao/types";

import ExamShell from "../components/ExamShell";
import JoinSessionPanel from "../components/JoinSessionPanel";
import { EXAM_COPY, type ExamCopy } from "../constants/exam-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import { defaultContentLanguage, pickText, type ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { fetchAvailableExams, startExamAttempt } from "../services/examApi";

type ExamCardViewProps = {
  exam: ExamCard;
  lang: ExamUiLanguage;
  copy: ExamCopy;
  isStarting: boolean;
  onStart: () => void;
};

export function isOutOfAttempts(exam: ExamCard): boolean {
  return (
    exam.inProgressAttemptId === null &&
    exam.maxAttempts !== null &&
    exam.attemptsUsed >= exam.maxAttempts
  );
}

function ExamCardView({ exam, lang, copy, isStarting, onStart }: ExamCardViewProps) {
  const language = defaultContentLanguage(lang);
  const isBlocked = isOutOfAttempts(exam);
  const description = pickText(language, exam.descriptionZh, exam.descriptionFr);
  return (
    <article className={styles.card}>
      <h2>{pickText(language, exam.titleZh, exam.titleFr)}</h2>
      {description ? <p className={styles.muted}>{description}</p> : null}
      <div className={styles.meta}>
        <span>{copy.questions(exam.questionCount)}</span>
        <span>
          {exam.sectionCount > 1
            ? copy.sections(exam.sectionCount, exam.timeLimitMinutes)
            : copy.timeLimit(exam.timeLimitMinutes)}
        </span>
        <span>{copy.passing(exam.passingScore)}</span>
        <span>{copy.attempts(exam.attemptsUsed, exam.maxAttempts)}</span>
        {exam.bestScore !== null ? <span>{copy.bestScore(exam.bestScore)}</span> : null}
        {exam.hasPassed ? <span className={styles.badgeOk}>{copy.passed}</span> : null}
      </div>
      <button
        type="button"
        className={styles.buttonPrimary}
        disabled={isBlocked || isStarting}
        onClick={onStart}
      >
        {isBlocked ? copy.noAttemptsLeft : exam.inProgressAttemptId ? copy.resume : copy.start}
      </button>
    </article>
  );
}

export default function ExamListPage() {
  const router = useRouter();
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_COPY[lang];
  const exams = useAsyncData(fetchAvailableExams, []);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async (templateId: number) => {
    setStartingId(templateId);
    setError(null);
    try {
      const attempt = await startExamAttempt(templateId);
      router.push(`/dashboard/exams/take?attemptId=${attempt.id}`);
    } catch (reason) {
      setError(describeExamError(reason, lang));
      setStartingId(null);
    }
  };

  return (
    <ExamShell
      lang={lang}
      onLanguageChange={setLang}
      kicker={copy.kicker}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      <JoinSessionPanel
        copy={copy}
        lang={lang}
        onJoined={(attempt) => router.push(`/dashboard/exams/take?attemptId=${attempt.id}`)}
      />
      <p>
        <Link className={styles.linkButton} href="/dashboard/exams/history">
          {copy.history} →
        </Link>
      </p>
      {error ? <p className={styles.error}>{error}</p> : null}
      {exams.isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {exams.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {exams.data?.length === 0 ? <p className={styles.muted}>{copy.noExams}</p> : null}
      <div className={styles.cardGrid}>
        {exams.data?.map((exam) => (
          <ExamCardView
            key={exam.templateId}
            exam={exam}
            lang={lang}
            copy={copy}
            isStarting={startingId === exam.templateId}
            onStart={() => void start(exam.templateId)}
          />
        ))}
      </div>
    </ExamShell>
  );
}

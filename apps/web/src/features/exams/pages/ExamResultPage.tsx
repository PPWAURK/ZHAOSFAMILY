"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AttemptResultView from "../components/AttemptResultView";
import ExamShell from "../components/ExamShell";
import { EXAM_COPY } from "../constants/exam-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { fetchExamAttempt } from "../services/examApi";

export default function ExamResultPage() {
  const attemptId = Number(useSearchParams().get("attemptId"));
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_COPY[lang];
  const attempt = useAsyncData(() => fetchExamAttempt(attemptId), [attemptId], attemptId > 0);
  const isInProgress = attempt.data?.status === "IN_PROGRESS";

  return (
    <ExamShell lang={lang} onLanguageChange={setLang} kicker={copy.kicker} title={copy.title}>
      <p className={styles.actions}>
        <Link className={styles.linkButton} href="/dashboard/exams">
          ← {copy.backToList}
        </Link>
        <Link className={styles.linkButton} href="/dashboard/exams/history">
          {copy.history}
        </Link>
      </p>
      {attempt.isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {attempt.error || !(attemptId > 0) ? <p className={styles.error}>{copy.loadError}</p> : null}
      {isInProgress ? (
        <Link
          className={styles.buttonPrimary}
          href={`/dashboard/exams/take?attemptId=${attemptId}`}
        >
          {copy.resume}
        </Link>
      ) : null}
      {attempt.data && !isInProgress ? (
        <AttemptResultView attempt={attempt.data} lang={lang} copy={copy} />
      ) : null}
    </ExamShell>
  );
}

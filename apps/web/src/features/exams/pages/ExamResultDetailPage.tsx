"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import AttemptResultView from "../components/AttemptResultView";
import ExamBankLayout from "../components/ExamBankLayout";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import { EXAM_COPY } from "../constants/exam-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchExamResultDetail } from "../services/examResultsApi";
import { formatDateTime } from "../utils/examFormat";

function DetailContent({ copy, lang }: { copy: ExamBankCopy; lang: ExamUiLanguage }) {
  const attemptId = Number(useSearchParams().get("attemptId"));
  const detail = useAsyncData(() => fetchExamResultDetail(attemptId), [attemptId], attemptId > 0);

  return (
    <>
      <Link className={styles.linkButton} href="/dashboard/exam-bank/results">
        ← {copy.results.back}
      </Link>
      {detail.isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {detail.error || !(attemptId > 0) ? <p className={styles.error}>{copy.loadError}</p> : null}
      {detail.data ? (
        <>
          <p className={styles.notice}>
            {detail.data.user.name} · {detail.data.user.email} · {detail.data.restaurant.name} ·{" "}
            {formatDateTime(detail.data.submittedAt, lang)}
          </p>
          <AttemptResultView attempt={detail.data} lang={lang} copy={EXAM_COPY[lang]} />
        </>
      ) : null}
    </>
  );
}

export default function ExamResultDetailPage() {
  return (
    <ExamBankLayout
      active="results"
      permission="exam.result.view"
      subtitle={(copy) => copy.results.subtitle}
    >
      {({ copy, lang }) => <DetailContent copy={copy} lang={lang} />}
    </ExamBankLayout>
  );
}

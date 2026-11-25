"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ExamCategory, ExamQuestionStats, ExamQuestionStatus } from "@zhao/types";

import { useAuth } from "@/features/auth/context/AuthContext";

import ExamBankLayout from "../components/ExamBankLayout";
import type { ExamBankCopy } from "../constants/exam-bank-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchExamCategories, fetchExamQuestionStats } from "../services/examQuestionsApi";
import { hasExamPermission } from "../utils/examAccess";

const STATUSES: ExamQuestionStatus[] = ["DRAFT", "APPROVED", "REJECTED", "ARCHIVED"];

function OverviewContent({ copy }: { copy: ExamBankCopy }) {
  const stats = useAsyncData<[ExamQuestionStats, ExamCategory[]]>(
    () => Promise.all([fetchExamQuestionStats(), fetchExamCategories()]),
    [],
  );
  if (stats.isLoading) return <p className={styles.muted}>{copy.loading}</p>;
  if (stats.error || !stats.data) return <p className={styles.error}>{copy.loadError}</p>;

  const [summary, categories] = stats.data;
  const approved = summary.byStatus.APPROVED ?? 0;
  const categoryName = (id: number | null) => {
    const category = categories.find((c) => c.id === id);
    return category ? `${category.nameZh} / ${category.nameFr}` : copy.overview.uncategorized;
  };

  return (
    <>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>{copy.overview.approvedPool}</span>
          <strong>{approved}</strong>
        </div>
        {(["single", "multiple", "boolean"] as const).map((type) => (
          <div key={type} className={styles.metric}>
            <span>{copy.types[type]}</span>
            <strong>{summary.approvedByType[type] ?? 0}</strong>
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>{copy.overview.byStatus}</h2>
      <div className={styles.metrics}>
        {STATUSES.map((status) => (
          <div key={status} className={styles.metric}>
            <span>{copy.questionStatuses[status]}</span>
            <strong>{summary.byStatus[status] ?? 0}</strong>
          </div>
        ))}
      </div>

      <h2 className={styles.sectionTitle}>{copy.overview.byCategory}</h2>
      {summary.approvedByCategory.length === 0 ? (
        <p className={styles.muted}>{copy.empty}</p>
      ) : (
        <table className={styles.table}>
          <tbody>
            {summary.approvedByCategory.map((row) => (
              <tr key={row.categoryId ?? "none"}>
                <th scope="row">{categoryName(row.categoryId)}</th>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function ExamBankOverviewPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isResultsOnly =
    hasExamPermission(user, "exam.result.view") && !hasExamPermission(user, "exam.bank.manage");

  // The menu entry is shared: viewers who cannot manage the bank go straight to results.
  useEffect(() => {
    if (isResultsOnly) router.replace("/dashboard/exam-bank/results");
  }, [isResultsOnly, router]);

  return (
    <ExamBankLayout active="overview" subtitle={(copy) => copy.overview.subtitle}>
      {({ copy }) => <OverviewContent copy={copy} />}
    </ExamBankLayout>
  );
}

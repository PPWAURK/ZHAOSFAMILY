"use client";

import Link from "next/link";

import ExamShell from "../components/ExamShell";
import StatusBadge from "../components/StatusBadge";
import { EXAM_COPY } from "../constants/exam-copy";
import { defaultContentLanguage, pickText } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { fetchMyExamAttempts } from "../services/examApi";
import { formatDateTime } from "../utils/examFormat";

export default function MyExamHistoryPage() {
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_COPY[lang];
  const language = defaultContentLanguage(lang);
  const history = useAsyncData(fetchMyExamAttempts, []);

  return (
    <ExamShell lang={lang} onLanguageChange={setLang} kicker={copy.kicker} title={copy.history}>
      <p>
        <Link className={styles.linkButton} href="/dashboard/exams">
          ← {copy.backToList}
        </Link>
      </p>
      {history.isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {history.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {history.data?.length === 0 ? <p className={styles.muted}>{copy.noExams}</p> : null}
      {history.data?.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(copy.historyColumns).map((label, index) => (
                  <th key={`${label}-${index}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.data.map((row) => (
                <tr key={row.id}>
                  <td>{pickText(language, row.titleZh, row.titleFr)}</td>
                  <td>
                    <StatusBadge status={row.status} label={copy.statuses[row.status]} />
                  </td>
                  <td>
                    {row.score ?? "—"}
                    {row.passed !== null ? (
                      <span
                        className={row.passed ? styles.badgeOk : styles.badgeBad}
                        style={{ marginLeft: 8 }}
                      >
                        {row.passed ? copy.result.pass : copy.result.fail}
                      </span>
                    ) : null}
                  </td>
                  <td>{formatDateTime(row.submittedAt ?? row.startedAt, lang)}</td>
                  <td>
                    <Link
                      className={styles.linkButton}
                      href={
                        row.status === "IN_PROGRESS"
                          ? `/dashboard/exams/take?attemptId=${row.id}`
                          : `/dashboard/exams/result?attemptId=${row.id}`
                      }
                    >
                      {row.status === "IN_PROGRESS" ? copy.resume : copy.view}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </ExamShell>
  );
}

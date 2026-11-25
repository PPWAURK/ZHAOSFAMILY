import Link from "next/link";
import type { GenerationJob } from "@zhao/types";

import type { ExamBankCopy } from "../constants/exam-bank-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { formatDateTime } from "../utils/examFormat";
import StatusBadge from "./StatusBadge";

/** Statuses of a job that is still running (pollable, cancelable). */
export const ACTIVE_JOB_STATUSES = new Set([
  "PLANNED",
  "SUBMITTING",
  "BATCH_RUNNING",
  "INGESTING",
  "CANCELING",
]);

function progressPercent(job: GenerationJob): number {
  return job.requestedCount
    ? Math.min(100, Math.round((job.keptCount / job.requestedCount) * 100))
    : 0;
}

export default function GenerationJobsTable({
  copy,
  lang,
  jobs,
  onCancel,
}: {
  copy: ExamBankCopy;
  lang: ExamUiLanguage;
  jobs: GenerationJob[];
  onCancel: (id: number) => void;
}) {
  const columns = copy.generation.columns;
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            {Object.values(columns).map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>#{job.id}</td>
              <td>{copy.generation.modes[job.mode] ?? job.mode}</td>
              <td>
                <StatusBadge status={job.status} label={copy.jobStatuses[job.status]} />
                <br />
                <span className={styles.muted}>{copy.generation.round(job.round)}</span>
                {job.errorCode ? <p className={styles.muted}>{job.errorCode}</p> : null}
              </td>
              <td>
                <div className={styles.progressBar} aria-label={`${progressPercent(job)}%`}>
                  <span style={{ width: `${progressPercent(job)}%` }} />
                </div>
                <span className={styles.muted}>
                  {job.keptCount} / {job.requestedCount}
                </span>
              </td>
              <td>{job.keptCount}</td>
              <td>{job.duplicateCount}</td>
              <td>{job.invalidCount}</td>
              <td>{job.draftCount}</td>
              <td>{formatDateTime(job.createdAt, lang)}</td>
              <td>
                <div className={styles.actions}>
                  {job.draftCount > 0 ? (
                    <Link
                      className={styles.button}
                      href={`/dashboard/exam-bank/review?jobId=${job.id}`}
                    >
                      {copy.generation.reviewDrafts}
                    </Link>
                  ) : null}
                  {ACTIVE_JOB_STATUSES.has(job.status) && job.status !== "CANCELING" ? (
                    <button
                      type="button"
                      className={styles.buttonDanger}
                      onClick={() => onCancel(job.id)}
                    >
                      {copy.generation.cancelJob}
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ExamSessionDetail, ExamSessionParticipant } from "@zhao/types";

import { downloadCsv } from "@/features/dashboard/utils/platformReportCsv";

import ExamSessionsLayout from "../components/ExamSessionsLayout";
import StatusBadge from "../components/StatusBadge";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import type { ExamSessionCopy } from "../constants/exam-session-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { useConfirmAction } from "../hooks/useConfirmAction";
import { useInterval } from "../hooks/useInterval";
import { closeExamSession, fetchExamSession, openExamSession } from "../services/examSessionsApi";
import { formatDateTime } from "../utils/examFormat";
import { buildExamSessionCsv, summarizeSession } from "../utils/examSessionCsv";
import { sessionWindowText } from "./ExamSessionsPage";

const REFRESH_MS = 10_000;
const ATTEMPT_TONE = { IN_PROGRESS: "warn", SUBMITTED: "ok", EXPIRED: "neutral" } as const;

function codeHint(session: ExamSessionDetail, copy: ExamSessionCopy): string {
  if (session.status === "CLOSED") return copy.codeClosed;
  return session.status === "OPEN" ? copy.codeHint : copy.codeInactive;
}

/** 「第 2/2 场」 or 「休息中」 for a running sectioned paper; null otherwise. */
export function participantSectionText(
  p: Pick<ExamSessionParticipant, "status" | "sectionIndex" | "sectionCount" | "isOnBreak">,
  copy: ExamSessionCopy,
): string | null {
  if (p.status !== "IN_PROGRESS" || !(p.sectionCount > 1)) return null;
  return p.isOnBreak ? copy.onBreak : copy.sectionProgress(p.sectionIndex + 1, p.sectionCount);
}

function ParticipantRow({
  p,
  copy,
  lang,
}: {
  p: ExamSessionParticipant;
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
}) {
  const percent = p.totalCount ? Math.round((p.answeredCount / p.totalCount) * 100) : 0;
  const sectionText = participantSectionText(p, copy);
  return (
    <tr>
      <td>{p.user.name}</td>
      <td>{p.restaurant.name}</td>
      <td>
        <div className={styles.progressBar} aria-label={`${percent}%`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className={styles.muted}>
          {p.answeredCount} / {p.totalCount}
        </span>
      </td>
      <td>
        <StatusBadge tone={ATTEMPT_TONE[p.status]} label={copy.attemptStatuses[p.status]} />
        {sectionText ? (
          <>
            <br />
            <span className={styles.muted}>{sectionText}</span>
          </>
        ) : null}
      </td>
      <td>
        {p.score ?? "—"}
        {p.passed !== null ? (
          <span className={p.passed ? styles.badgeOk : styles.badgeBad} style={{ marginLeft: 8 }}>
            {p.passed ? copy.pass : copy.fail}
          </span>
        ) : null}
      </td>
      <td>{formatDateTime(p.startedAt, lang)}</td>
      <td>{formatDateTime(p.submittedAt, lang)}</td>
    </tr>
  );
}

function SessionBody({
  session,
  copy,
  lang,
}: {
  session: ExamSessionDetail;
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
}) {
  const stats = summarizeSession(session);
  return (
    <>
      <div className={styles.metrics}>
        {(["participants", "inProgress", "submitted", "passed"] as const).map((key) => (
          <div key={key} className={styles.metric}>
            <span>{copy.metrics[key]}</span>
            <strong>{stats[key]}</strong>
          </div>
        ))}
        <div className={styles.metric}>
          <span>{copy.metrics.average}</span>
          <strong>{stats.average ?? "—"}</strong>
        </div>
      </div>
      {session.participants.length === 0 ? (
        <p className={styles.muted}>{copy.noParticipants}</p>
      ) : null}
      {session.participants.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(copy.participantColumns).map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {session.participants.map((p) => (
                <ParticipantRow key={p.attemptId} p={p} copy={copy} lang={lang} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function DetailContent({ copy, lang }: { copy: ExamSessionCopy; lang: ExamUiLanguage }) {
  const sessionId = Number(useSearchParams().get("sessionId"));
  const confirm = useConfirmAction();
  const detail = useAsyncData(() => fetchExamSession(sessionId), [sessionId], sessionId > 0);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const session = detail.data;
  useInterval(detail.reload, session && session.status !== "CLOSED" ? REFRESH_MS : null);

  const run = async (action: () => Promise<unknown>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
      detail.reload();
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsBusy(false);
    }
  };
  const close = async () => {
    if (await confirm({ message: copy.confirmClose, tone: "danger" })) {
      await run(() => closeExamSession(sessionId));
    }
  };

  return (
    <>
      <Link className={styles.linkButton} href="/dashboard/exam-sessions">
        ← {copy.back}
      </Link>
      {detail.isLoading && !session ? <p className={styles.muted}>{copy.loading}</p> : null}
      {detail.error || !(sessionId > 0) ? <p className={styles.error}>{copy.loadError}</p> : null}
      {session ? (
        <>
          <div className={styles.panel}>
            <p className={styles.field}>{copy.codeLabel}</p>
            <p
              className={`${styles.sessionCode} ${session.status !== "OPEN" ? styles.sessionCodeInactive : ""}`}
            >
              {session.code}
            </p>
            <p className={styles.muted}>{codeHint(session, copy)}</p>
            <div className={styles.meta}>
              <StatusBadge
                tone={
                  session.status === "OPEN"
                    ? "ok"
                    : session.status === "CLOSED"
                      ? "neutral"
                      : "warn"
                }
                label={copy.statuses[session.status]}
              />
              <span>{lang === "zh" ? session.template.titleZh : session.template.titleFr}</span>
              {session.label ? <span>{session.label}</span> : null}
              <span>{sessionWindowText(session, copy, lang)}</span>
              <span>{session.examiner.name}</span>
            </div>
            <div className={styles.actions} style={{ marginTop: 16 }}>
              {session.status === "SCHEDULED" ? (
                <button
                  type="button"
                  className={styles.buttonPrimary}
                  disabled={isBusy}
                  onClick={() => void run(() => openExamSession(sessionId))}
                >
                  {copy.open}
                </button>
              ) : null}
              {session.status !== "CLOSED" ? (
                <button
                  type="button"
                  className={styles.buttonDanger}
                  disabled={isBusy}
                  onClick={() => void close()}
                >
                  {copy.close}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.button}
                disabled={!session.participants.length}
                onClick={() =>
                  downloadCsv(`exam-session-${session.code}.csv`, buildExamSessionCsv(session))
                }
              >
                {copy.exportCsv}
              </button>
              {session.status !== "CLOSED" ? (
                <span className={styles.muted}>{copy.autoRefresh}</span>
              ) : null}
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
          </div>
          <SessionBody session={session} copy={copy} lang={lang} />
        </>
      ) : null}
    </>
  );
}

export default function ExamSessionDetailPage() {
  return (
    <ExamSessionsLayout>
      {({ copy, lang }) => <DetailContent copy={copy} lang={lang} />}
    </ExamSessionsLayout>
  );
}

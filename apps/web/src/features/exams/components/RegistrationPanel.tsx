"use client";

import { useState } from "react";
import type { ExamSessionDetail, ExamSessionRegistration } from "@zhao/types";

import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import type { ExamSessionCopy } from "../constants/exam-session-copy";
import styles from "../exams.module.css";
import { removeRegistration } from "../services/examSessionsApi";
import CandidatePicker from "./CandidatePicker";
import StatusBadge from "./StatusBadge";

const TONE = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "warn",
  SUBMITTED: "ok",
  ABSENT: "neutral",
} as const;

type RegistrationPanelProps = {
  session: ExamSessionDetail;
  registrations: readonly ExamSessionRegistration[];
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
  onChanged: () => void;
};

/** The roster of an examiner's session: who is registered, and who still has to show up. */
export default function RegistrationPanel({
  session,
  registrations,
  copy,
  lang,
  onChanged,
}: RegistrationPanelProps) {
  const text = copy.registration;
  const [error, setError] = useState<string | null>(null);
  const isClosed = session.status === "CLOSED";

  const remove = async (userId: number) => {
    setError(null);
    try {
      await removeRegistration(session.id, userId);
      onChanged();
    } catch (reason) {
      setError(describeExamError(reason, lang));
    }
  };

  return (
    <>
      <h2 className={styles.sectionTitle}>
        {text.title} · {text.registeredCount(registrations.length)}
      </h2>
      {session.requireRegistration ? null : <p className={styles.muted}>{text.notNeeded}</p>}
      {registrations.length === 0 ? <p className={styles.muted}>{text.empty}</p> : null}
      {registrations.length ? (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {Object.values(text.columns).map((label, index) => (
                  <th key={`${label}-${index}`}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.userId}>
                  <td>{r.name}</td>
                  <td>{r.restaurant.name}</td>
                  <td>{r.jobRole ?? "—"}</td>
                  <td>
                    <StatusBadge tone={TONE[r.status]} label={text.statuses[r.status]} />
                  </td>
                  <td>
                    {r.status === "NOT_STARTED" || r.status === "ABSENT" ? (
                      <button
                        type="button"
                        className={styles.button}
                        disabled={isClosed}
                        onClick={() => void remove(r.userId)}
                      >
                        {text.remove}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {isClosed ? null : (
        <CandidatePicker sessionId={session.id} copy={copy} lang={lang} onAdded={onChanged} />
      )}
    </>
  );
}

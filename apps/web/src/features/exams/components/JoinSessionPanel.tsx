"use client";

import { useState, type FormEvent } from "react";
import type { ExamAttempt } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { joinExamSession } from "../services/examSessionsApi";

/** Keeps digits only, at most six. */
export function normalizeSessionCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

type JoinSessionPanelProps = {
  copy: ExamCopy;
  lang: ExamUiLanguage;
  onJoined: (attempt: ExamAttempt) => void;
};

/** Employees type the examiner's 6-digit code to enter a proctored session. */
export default function JoinSessionPanel({ copy, lang, onJoined }: JoinSessionPanelProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) return;
    setIsJoining(true);
    setError(null);
    try {
      onJoined(await joinExamSession(code));
    } catch (reason) {
      setError(describeExamError(reason, lang));
      setIsJoining(false);
    }
  };

  return (
    <form className={styles.joinPanel} onSubmit={(event) => void submit(event)}>
      <label className={styles.field}>
        {copy.join.title}
        <input
          value={code}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-describedby="exam-join-hint"
          onChange={(e) => setCode(normalizeSessionCode(e.target.value))}
        />
      </label>
      <button
        type="submit"
        className={styles.buttonPrimary}
        disabled={code.length !== 6 || isJoining}
      >
        {isJoining ? copy.join.joining : copy.join.button}
      </button>
      <p id="exam-join-hint" className={styles.muted} style={{ flexBasis: "100%", margin: 0 }}>
        {copy.join.hint}
      </p>
      {error ? (
        <p className={styles.error} style={{ flexBasis: "100%", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

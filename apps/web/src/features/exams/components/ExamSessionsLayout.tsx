"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";

import { EXAM_SESSION_COPY, type ExamSessionCopy } from "../constants/exam-session-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useExamLanguage } from "../hooks/useExamLanguage";
import { canRunSessions } from "../utils/examAccess";
import ExamShell from "./ExamShell";

type ExamSessionsLayoutProps = {
  children: (context: { lang: ExamUiLanguage; copy: ExamSessionCopy }) => ReactNode;
};

/** Examiner shell with the page-level permission check (the menu entry alone is not a guard). */
export default function ExamSessionsLayout({ children }: ExamSessionsLayoutProps) {
  const { user, isLoading } = useAuth();
  const [lang, setLang] = useExamLanguage();
  const copy = EXAM_SESSION_COPY[lang];
  const isAllowed = canRunSessions(user);

  return (
    <ExamShell
      lang={lang}
      onLanguageChange={setLang}
      kicker={copy.kicker}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      {isLoading ? <p className={styles.muted}>{copy.loading}</p> : null}
      {!isLoading && !isAllowed ? <p className={styles.error}>{copy.noAccess}</p> : null}
      {!isLoading && isAllowed ? children({ lang, copy }) : null}
    </ExamShell>
  );
}

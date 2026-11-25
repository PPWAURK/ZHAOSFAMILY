"use client";

import type { MyExamSession } from "@zhao/types";

import type { ExamCopy } from "../constants/exam-copy";
import { pickText, defaultContentLanguage, type ExamUiLanguage } from "../constants/exam-languages";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import { fetchMySessions } from "../services/examSessionsApi";
import { formatDateTime } from "../utils/examFormat";

function stateText(session: MyExamSession, copy: ExamCopy): string {
  const text = copy.mySessions;
  if (session.attemptStatus === "IN_PROGRESS") return text.inProgress;
  if (session.attemptStatus) return text.submitted;
  return session.status === "OPEN" ? text.open : text.waiting;
}

/** Exams the examiner registered the signed-in employee for. Renders nothing when there are none. */
export default function MySessionsSection({
  copy,
  lang,
}: {
  copy: ExamCopy;
  lang: ExamUiLanguage;
}) {
  const sessions = useAsyncData(fetchMySessions, []);
  if (!sessions.data?.length) return null;
  const language = defaultContentLanguage(lang);
  return (
    <section className={styles.panel}>
      <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
        {copy.mySessions.title}
      </h2>
      <p className={styles.muted}>{copy.mySessions.hint}</p>
      <div className={styles.cardGrid}>
        {sessions.data.map((s) => (
          <article key={s.id} className={styles.card}>
            <h3>{pickText(language, s.template.titleZh, s.template.titleFr)}</h3>
            {s.label ? <p className={styles.muted}>{s.label}</p> : null}
            <div className={styles.meta}>
              <span>{stateText(s, copy)}</span>
              {s.startsAt ? <span>{formatDateTime(s.startsAt, lang)}</span> : null}
              <span>{copy.mySessions.examiner(s.examiner.name)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

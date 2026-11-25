"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ExamSession, ExamSessionTemplateOption } from "@zhao/types";

import ExamSessionsLayout from "../components/ExamSessionsLayout";
import StatusBadge from "../components/StatusBadge";
import { describeExamError } from "../constants/exam-errors-copy";
import type { ExamUiLanguage } from "../constants/exam-languages";
import type { ExamSessionCopy } from "../constants/exam-session-copy";
import styles from "../exams.module.css";
import { useAsyncData } from "../hooks/useAsyncData";
import {
  createExamSession,
  fetchExamSessions,
  fetchSessionTemplates,
} from "../services/examSessionsApi";
import { formatDateTime } from "../utils/examFormat";

const STATUS_TONE = { SCHEDULED: "warn", OPEN: "ok", CLOSED: "neutral" } as const;

/** <input type="datetime-local"> gives local time without zone; send it as ISO. */
const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);

export function sessionWindowText(
  session: Pick<ExamSession, "startsAt" | "endsAt">,
  copy: ExamSessionCopy,
  lang: ExamUiLanguage,
): string {
  const parts = [
    session.startsAt ? copy.windowFrom(formatDateTime(session.startsAt, lang)) : null,
    session.endsAt ? copy.windowUntil(formatDateTime(session.endsAt, lang)) : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : copy.noWindow;
}

function templateLabel(
  t: ExamSessionTemplateOption,
  copy: ExamSessionCopy,
  lang: ExamUiLanguage,
): string {
  const title = lang === "zh" ? t.titleZh : t.titleFr;
  const time = t.timeLimitMinutes ? copy.create.minutes(t.timeLimitMinutes) : copy.create.noLimit;
  const mode = t.accessMode === "CODE" ? ` · ${copy.create.codeOnly}` : "";
  const sections = t.sectionCount > 1 ? ` · ${copy.create.sections(t.sectionCount)}` : "";
  return `${title} · ${copy.create.questions(t.questionCount)}${sections} · ${time}${mode}`;
}

type CreateFormProps = {
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
  templates: ExamSessionTemplateOption[];
  onCreated: (session: ExamSession) => void;
};

function CreateSessionForm({ copy, lang, templates, onCreated }: CreateFormProps) {
  const [templateId, setTemplateId] = useState("");
  const [label, setLabel] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!templateId) return;
    setIsSaving(true);
    setError(null);
    try {
      onCreated(
        await createExamSession({
          templateId: Number(templateId),
          label: label.trim() || undefined,
          startsAt: toIso(startsAt),
          endsAt: toIso(endsAt),
        }),
      );
    } catch (reason) {
      setError(describeExamError(reason, lang));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className={styles.panel} onSubmit={(event) => void submit(event)}>
      <h2 className={styles.sectionTitle} style={{ marginTop: 0 }}>
        {copy.create.title}
      </h2>
      <div className={styles.formGrid}>
        <label className={styles.field}>
          {copy.create.template}
          <select value={templateId} required onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">{copy.create.chooseTemplate}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {templateLabel(t, copy, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          {copy.create.label}
          <input value={label} maxLength={100} onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className={styles.field}>
          {copy.create.startsAt}
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          {copy.create.endsAt}
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <button type="submit" className={styles.buttonPrimary} disabled={isSaving || !templateId}>
          {copy.create.submit}
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}

function SessionsTable({
  copy,
  lang,
  sessions,
}: {
  copy: ExamSessionCopy;
  lang: ExamUiLanguage;
  sessions: ExamSession[];
}) {
  return (
    <div className={styles.tableScroller}>
      <table className={styles.table}>
        <thead>
          <tr>
            {Object.values(copy.columns).map((label, index) => (
              <th key={`${label}-${index}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>
                <strong className={styles.progressText}>{session.code}</strong>
              </td>
              <td>
                {lang === "zh" ? session.template.titleZh : session.template.titleFr}
                {session.label ? (
                  <>
                    <br />
                    <span className={styles.muted}>{session.label}</span>
                  </>
                ) : null}
              </td>
              <td>
                <StatusBadge
                  tone={STATUS_TONE[session.status]}
                  label={copy.statuses[session.status]}
                />
              </td>
              <td>{sessionWindowText(session, copy, lang)}</td>
              <td>
                {session.participantCount} / {session.submittedCount}
              </td>
              <td>{session.examiner.name}</td>
              <td>
                <Link
                  className={styles.button}
                  href={`/dashboard/exam-sessions/detail?sessionId=${session.id}`}
                >
                  {copy.manage}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionsContent({ copy, lang }: { copy: ExamSessionCopy; lang: ExamUiLanguage }) {
  const router = useRouter();
  const sessions = useAsyncData(fetchExamSessions, []);
  const templates = useAsyncData(fetchSessionTemplates, []);

  return (
    <>
      <CreateSessionForm
        copy={copy}
        lang={lang}
        templates={templates.data ?? []}
        onCreated={(session) =>
          router.push(`/dashboard/exam-sessions/detail?sessionId=${session.id}`)
        }
      />
      {sessions.isLoading && !sessions.data ? <p className={styles.muted}>{copy.loading}</p> : null}
      {sessions.error ? <p className={styles.error}>{copy.loadError}</p> : null}
      {sessions.data?.length === 0 ? <p className={styles.muted}>{copy.empty}</p> : null}
      {sessions.data?.length ? (
        <SessionsTable copy={copy} lang={lang} sessions={sessions.data} />
      ) : null}
    </>
  );
}

export default function ExamSessionsPage() {
  return (
    <ExamSessionsLayout>
      {({ copy, lang }) => <SessionsContent copy={copy} lang={lang} />}
    </ExamSessionsLayout>
  );
}

import type { ExamSessionDetail, ExamSessionRegistration } from "@zhao/types";

import { buildCsv, type CsvValue } from "./csv";

const HEADER: CsvValue[] = [
  "session_code",
  "exam_zh",
  "exam_fr",
  "employee",
  "store",
  "status",
  "answered",
  "total",
  "score",
  "passed",
  "started_at",
  "submitted_at",
];

/** One row per participant of a session, plus registered users who never joined. */
export function buildExamSessionCsv(
  session: ExamSessionDetail,
  registrations: readonly ExamSessionRegistration[] = [],
): string {
  const joined = new Set(session.participants.map((p) => p.user.id));
  const missing: CsvValue[][] = registrations
    .filter((r) => !joined.has(r.userId))
    .map((r) => [
      session.code,
      session.template.titleZh,
      session.template.titleFr,
      r.name,
      r.restaurant.name,
      r.status,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  const rows: CsvValue[][] = session.participants.map((p) => [
    session.code,
    session.template.titleZh,
    session.template.titleFr,
    p.user.name,
    p.restaurant.name,
    p.status,
    p.answeredCount,
    p.totalCount,
    p.score,
    p.passed === null ? null : p.passed ? "yes" : "no",
    p.startedAt,
    p.submittedAt,
  ]);
  return buildCsv([HEADER, ...rows, ...missing]);
}

export function summarizeSession(session: ExamSessionDetail) {
  const graded = session.participants.filter((p) => p.score !== null);
  const average = graded.length
    ? Math.round(graded.reduce((sum, p) => sum + (p.score ?? 0), 0) / graded.length)
    : null;
  return {
    participants: session.participants.length,
    inProgress: session.participants.filter((p) => p.status === "IN_PROGRESS").length,
    submitted: graded.length,
    passed: graded.filter((p) => p.passed).length,
    average,
  };
}

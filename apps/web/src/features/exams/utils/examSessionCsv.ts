import type { ExamSessionDetail } from "@zhao/types";

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

/** One row per participant of a session. */
export function buildExamSessionCsv(session: ExamSessionDetail): string {
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
  return buildCsv([HEADER, ...rows]);
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

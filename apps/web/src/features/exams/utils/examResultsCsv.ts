import type { ExamResultRow } from "@zhao/types";

import { buildCsv, type CsvValue } from "./csv";

const HEADER: CsvValue[] = [
  "attempt_id",
  "exam_zh",
  "exam_fr",
  "employee",
  "email",
  "store",
  "status",
  "score",
  "passed",
  "correct",
  "total",
  "started_at",
  "submitted_at",
  "duration_seconds",
];

function toLine(row: ExamResultRow): CsvValue[] {
  return [
    row.id,
    row.titleZh,
    row.titleFr,
    row.user.name,
    row.user.email,
    row.restaurant.name,
    row.status,
    row.score,
    row.passed === null ? null : row.passed ? "yes" : "no",
    row.correctCount,
    row.totalCount,
    row.startedAt,
    row.submittedAt,
    row.durationSeconds,
  ];
}

export function buildExamResultsCsv(rows: readonly ExamResultRow[]): string {
  return buildCsv([HEADER, ...rows.map(toLine)]);
}

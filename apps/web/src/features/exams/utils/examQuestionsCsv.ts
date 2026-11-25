import type { ExamQuestion } from "@zhao/types";

import { buildCsv, type CsvValue } from "./csv";

/** Choice questions have at most five options (A–E); true/false use keys "true"/"false". */
const OPTION_SLOTS = 5;

const HEADER: CsvValue[] = [
  "id",
  "status",
  "type",
  "difficulty",
  "category_code",
  "category_zh",
  "category_fr",
  "knowledge_point",
  "prompt_zh",
  "prompt_fr",
  ...Array.from({ length: OPTION_SLOTS }, (_, i) => [
    `option_${i + 1}_key`,
    `option_${i + 1}_zh`,
    `option_${i + 1}_fr`,
  ]).flat(),
  "correct_keys",
  "explanation_zh",
  "explanation_fr",
  "evidence",
  "source_material",
  "generation_job_id",
  "reject_reason",
  "created_at",
];

function optionCells(question: ExamQuestion): CsvValue[] {
  return Array.from({ length: OPTION_SLOTS }, (_, i) => {
    const option = question.options[i];
    return option ? [option.key, option.zh, option.fr] : [null, null, null];
  }).flat();
}

function toLine(question: ExamQuestion): CsvValue[] {
  return [
    question.id,
    question.status,
    question.type,
    question.difficulty,
    question.category?.code ?? null,
    question.category?.nameZh ?? null,
    question.category?.nameFr ?? null,
    question.knowledgePoint,
    question.promptZh,
    question.promptFr,
    ...optionCells(question),
    question.correctKeys.join("|"),
    question.explanationZh,
    question.explanationFr,
    question.evidence,
    question.sourceMaterial?.title ?? null,
    question.generationJobId,
    question.rejectReason,
    question.createdAt,
  ];
}

/** One row per question with both languages, for offline review in Excel. */
export function buildExamQuestionsCsv(questions: readonly ExamQuestion[]): string {
  return buildCsv([HEADER, ...questions.map(toLine)]);
}

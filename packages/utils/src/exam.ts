/**
 * Pure helpers for taking an exam, shared by web and mobile. Types are
 * structural so this package stays free of dependencies.
 */

export type ExamAnswerMap = Readonly<Record<number, readonly string[]>>;
export type ExamAnswerEntry = { questionId: number; selectedKeys: string[] };
export type ExamContentLanguage = "zh" | "fr";

/** Single/boolean replace the choice; multiple toggles the key. Returns a new map. */
export function toggleExamAnswer(
  answers: ExamAnswerMap,
  questionId: number,
  type: string,
  key: string,
): ExamAnswerMap {
  const current = answers[questionId] ?? [];
  if (type !== "multiple") return { ...answers, [questionId]: [key] };
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  return { ...answers, [questionId]: next };
}

export function toExamAnswerMap(answers: readonly ExamAnswerEntry[]): ExamAnswerMap {
  return Object.fromEntries(answers.map((a) => [a.questionId, a.selectedKeys]));
}

export function toExamAnswerList(answers: ExamAnswerMap): ExamAnswerEntry[] {
  return Object.entries(answers)
    .filter(([, keys]) => keys.length > 0)
    .map(([questionId, keys]) => ({ questionId: Number(questionId), selectedKeys: [...keys] }));
}

export function isExamQuestionAnswered(answers: ExamAnswerMap, questionId: number): boolean {
  return Boolean(answers[questionId]?.length);
}

/** 1-based positions of the questions that still have no answer. */
export function unansweredExamNumbers(
  questionIds: readonly number[],
  answers: ExamAnswerMap,
): number[] {
  return questionIds.flatMap((id, index) =>
    isExamQuestionAnswered(answers, id) ? [] : [index + 1],
  );
}

/**
 * Offset between the server clock and this device, measured when the attempt
 * was fetched, so a wrong device clock cannot shorten or extend the exam.
 */
export function computeExamClockOffset(serverNow: string, receivedAt: number): number {
  return new Date(serverNow).getTime() - receivedAt;
}

/** Milliseconds left before the deadline, never negative; null when untimed. */
export function examRemainingMs(
  deadlineAt: string | null,
  clockOffset: number,
  now: number,
): number | null {
  if (!deadlineAt) return null;
  return Math.max(0, new Date(deadlineAt).getTime() - (now + clockOffset));
}

export function formatExamCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/** Question content exists in zh and fr; falls back to the other language when one is empty. */
export function pickExamText(
  language: ExamContentLanguage,
  zh: string | null | undefined,
  fr: string | null | undefined,
): string {
  return (language === "zh" ? zh || fr : fr || zh) ?? "";
}

/** Network failures carry no HTTP status (0); retry those and server errors, never 4xx. */
export function isTransientRequestError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status !== "number" || status === 0 || status >= 500;
}

type ExamSectionState = {
  sections: readonly unknown[] | null;
  sectionIndex: number;
};

/** 1 for a single-section paper. */
export function examSectionCount(attempt: ExamSectionState): number {
  return attempt.sections?.length ?? 1;
}

/** Handing in the last section grades the paper; earlier ones start the break. */
export function isLastExamSection(attempt: ExamSectionState): boolean {
  return attempt.sectionIndex >= examSectionCount(attempt) - 1;
}

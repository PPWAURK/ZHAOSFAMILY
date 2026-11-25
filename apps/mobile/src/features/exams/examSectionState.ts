import type { ExamAnswer, ExamAttempt } from "@zhao/types";
import { toExamAnswerMap, type ExamAnswerMap } from "@zhao/utils";

/** On the break between two sections: no questions until the next one starts. */
export function isExamOnBreak(attempt: ExamAttempt): boolean {
  return attempt.breakEndsAt !== null && !attempt.questions?.length;
}

/**
 * Server answers merged under the local ones: what the phone holds is never
 * older than what it saved, and earlier sections' answers stay untouched.
 */
export function mergeExamAnswers(
  serverAnswers: readonly ExamAnswer[],
  local: ExamAnswerMap,
): ExamAnswerMap {
  return { ...toExamAnswerMap(serverAnswers), ...local };
}

/** `sectionIndex` to send on submit; undefined keeps single-section papers unchanged. */
export function submitSectionIndex(attempt: ExamAttempt): number | undefined {
  return attempt.sections ? attempt.sectionIndex : undefined;
}

/** Error codes meaning the phone's idea of the current section is stale. */
const STALE_SECTION_CODES = new Set(["EXAM_SECTION_ON_BREAK", "EXAM_SECTION_INVALID"]);

export function isStaleSectionError(error: unknown): boolean {
  return error instanceof Error && STALE_SECTION_CODES.has(error.message);
}

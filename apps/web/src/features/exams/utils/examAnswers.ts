import { unansweredExamNumbers, type ExamAnswerMap } from "@zhao/utils";

// Shared with mobile through @zhao/utils; local names kept for the web feature.
export type { ExamAnswerMap as AnswerMap } from "@zhao/utils";
export {
  toExamAnswerList as toAnswerList,
  toExamAnswerMap as toAnswerMap,
  toggleExamAnswer as toggleAnswer,
} from "@zhao/utils";

export function countUnanswered(questionIds: readonly number[], answers: ExamAnswerMap): number {
  return unansweredExamNumbers(questionIds, answers).length;
}

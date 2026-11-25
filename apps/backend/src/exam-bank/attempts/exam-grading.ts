import type { QuestionOption } from '../exam-bank.types';

export type SnapshotQuestion = {
  id: number;
  type: string;
  promptZh: string;
  promptFr: string;
  options: QuestionOption[];
  correctKeys: string[];
  explanationZh: string | null;
  explanationFr: string | null;
  /** Sectioned papers only. */
  section?: number;
  categoryId?: number | null;
};

export type AttemptAnswer = { questionId: number; selectedKeys: string[] };
export type QuestionResult = { questionId: number; isCorrect: boolean };

/** A category with at most `maxWrong` wrong answers allowed (企业文化 veto). */
export type GradeRule = {
  categoryId: number;
  labelZh: string;
  labelFr: string;
  maxWrong: number;
};

export type RuleResult = GradeRule & {
  totalCount: number;
  wrongCount: number;
  passed: boolean;
};

export type GradeResult = {
  results: QuestionResult[];
  correctCount: number;
  score: number;
  passed: boolean;
  ruleResults: RuleResult[];
};

export function evaluateRules(
  snapshot: readonly SnapshotQuestion[],
  results: readonly QuestionResult[],
  rules: readonly GradeRule[],
): RuleResult[] {
  const correct = new Map(results.map((r) => [r.questionId, r.isCorrect]));
  return rules.map((rule) => {
    const questions = snapshot.filter((q) => q.categoryId === rule.categoryId);
    const wrongCount = questions.filter((q) => !correct.get(q.id)).length;
    return {
      ...rule,
      totalCount: questions.length,
      wrongCount,
      passed: wrongCount <= rule.maxWrong,
    };
  });
}

/** Exact set match: for multiple choice every correct key and nothing else. */
export function isCorrect(
  selected: readonly string[],
  correct: readonly string[],
): boolean {
  const chosen = new Set(selected);
  return (
    chosen.size === correct.length && correct.every((key) => chosen.has(key))
  );
}

/**
 * Unanswered questions count as wrong. Score is a rounded percentage; the
 * paper passes only when the score is reached and every veto rule holds.
 */
export function gradeAttempt(
  snapshot: readonly SnapshotQuestion[],
  answers: readonly AttemptAnswer[],
  passingScore: number,
  rules: readonly GradeRule[] = [],
): GradeResult {
  const byQuestion = new Map(
    answers.map((a) => [a.questionId, a.selectedKeys]),
  );
  const results = snapshot.map((q) => ({
    questionId: q.id,
    isCorrect: isCorrect(byQuestion.get(q.id) ?? [], q.correctKeys),
  }));
  const correctCount = results.filter((r) => r.isCorrect).length;
  const score = snapshot.length
    ? Math.round((correctCount / snapshot.length) * 100)
    : 0;
  const ruleResults = evaluateRules(snapshot, results, rules);
  return {
    results,
    correctCount,
    score,
    passed: score >= passingScore && ruleResults.every((r) => r.passed),
    ruleResults,
  };
}

/**
 * Returns an error code when answers reference questions outside the attempt,
 * repeat a question, use unknown keys, or pick several keys for a
 * single-answer question.
 */
export function validateAnswers(
  snapshot: readonly SnapshotQuestion[],
  answers: readonly AttemptAnswer[],
): string | null {
  const questions = new Map(snapshot.map((q) => [q.id, q]));
  const seen = new Set<number>();
  for (const answer of answers) {
    const question = questions.get(answer.questionId);
    if (!question || seen.has(answer.questionId))
      return 'EXAM_ANSWER_QUESTION_INVALID';
    seen.add(answer.questionId);
    const keys = new Set(question.options.map((o) => o.key));
    if (new Set(answer.selectedKeys).size !== answer.selectedKeys.length)
      return 'EXAM_ANSWER_KEYS_INVALID';
    if (answer.selectedKeys.some((k) => !keys.has(k)))
      return 'EXAM_ANSWER_KEYS_INVALID';
    if (question.type !== 'multiple' && answer.selectedKeys.length > 1)
      return 'EXAM_ANSWER_KEYS_INVALID';
  }
  return null;
}

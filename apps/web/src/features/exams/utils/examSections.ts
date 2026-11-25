import type { ExamAttempt, ExamRuleResult } from "@zhao/types";

type GradedResult = NonNullable<ExamAttempt["result"]>;

/** Veto rules the paper broke. */
export function failedRules(result: Pick<GradedResult, "rules">): ExamRuleResult[] {
  return (result.rules ?? []).filter((rule) => !rule.passed);
}

/**
 * True when the score alone would pass but a veto rule failed the paper —
 * the result page must then say why it is a fail.
 */
export function isFailedByRule(
  result: Pick<GradedResult, "passed" | "score" | "rules">,
  passingScore: number,
): boolean {
  return !result.passed && result.score >= passingScore && failedRules(result).length > 0;
}

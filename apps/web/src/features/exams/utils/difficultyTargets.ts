import type { ExamDifficultyCounts, ExamQuestionDifficulty } from "@zhao/types";

/** 记忆 (recall a fact) · 理解 (judge a practice) · 情景 (on-site scenario), in display order. */
export const EXAM_DIFFICULTIES: readonly ExamQuestionDifficulty[] = [
  "recall",
  "understand",
  "scenario",
];

export type DifficultyProfileKey = "recallHeavy" | "balanced" | "scenarioHeavy";

/** Preset ratios recall:understand:scenario for a material's bank targets. */
export const DIFFICULTY_PROFILES: Readonly<Record<DifficultyProfileKey, ExamDifficultyCounts>> = {
  recallHeavy: { recall: 5, understand: 3, scenario: 2 },
  balanced: { recall: 4, understand: 3, scenario: 3 },
  scenarioHeavy: { recall: 2, understand: 3, scenario: 5 },
};

export const DIFFICULTY_PROFILE_KEYS = Object.keys(DIFFICULTY_PROFILES) as DifficultyProfileKey[];

export function emptyDifficultyCounts(): ExamDifficultyCounts {
  return { recall: 0, understand: 0, scenario: 0 };
}

export function sumCounts(counts: Readonly<Record<string, number>>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/**
 * Splits `total` along `ratio` with the largest-remainder method: every share
 * gets its floor, the leftover units go to the largest fractional parts (ties
 * in difficulty order), so the parts always add up to `total`.
 */
export function splitByRatio(total: number, ratio: ExamDifficultyCounts): ExamDifficultyCounts {
  const weight = sumCounts(ratio);
  const whole = Math.max(0, Math.floor(total));
  if (whole === 0 || weight <= 0) return emptyDifficultyCounts();
  const exact = EXAM_DIFFICULTIES.map((d) => (whole * ratio[d]) / weight);
  const shares = exact.map(Math.floor);
  const leftover = whole - shares.reduce((sum, n) => sum + n, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - shares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const bonus = new Set(byRemainder.slice(0, leftover).map((entry) => entry.index));
  return {
    recall: shares[0] + (bonus.has(0) ? 1 : 0),
    understand: shares[1] + (bonus.has(1) ? 1 : 0),
    scenario: shares[2] + (bonus.has(2) ? 1 : 0),
  };
}

/** "5 / 3 / 2" in recall / understand / scenario order. */
export function formatDifficultyCounts(counts: ExamDifficultyCounts): string {
  return EXAM_DIFFICULTIES.map((d) => counts[d]).join(" / ");
}

/** Reads a number input: empty or invalid becomes 0, decimals are dropped. */
export function toCount(value: string): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

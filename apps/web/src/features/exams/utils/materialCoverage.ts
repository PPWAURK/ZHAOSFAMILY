import type { ExamCategory, ExamDifficultyCounts, MaterialCoverage } from "@zhao/types";

import { EXAM_DIFFICULTIES, emptyDifficultyCounts, sumCounts } from "./difficultyTargets";

export type CoverageGroup = {
  /** null for materials without a category (listed last). */
  category: ExamCategory | null;
  rows: MaterialCoverage[];
};

export type CoverageTotals = {
  targets: ExamDifficultyCounts;
  approved: ExamDifficultyCounts;
  draft: ExamDifficultyCounts;
  missing: ExamDifficultyCounts;
};

/** Groups materials by category in the categories' sort order; unknown or no category last. */
export function groupCoverageByCategory(
  rows: readonly MaterialCoverage[],
  categories: readonly ExamCategory[],
): CoverageGroup[] {
  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  const known = new Set(ordered.map((c) => c.id));
  const groups: CoverageGroup[] = ordered.map((category) => ({
    category,
    rows: rows.filter((row) => row.categoryId === category.id),
  }));
  const rest = rows.filter((row) => row.categoryId === null || !known.has(row.categoryId));
  return [...groups, { category: null, rows: rest }].filter((group) => group.rows.length > 0);
}

const addCounts = (
  a: ExamDifficultyCounts,
  b: ExamDifficultyCounts | null,
): ExamDifficultyCounts =>
  b
    ? {
        recall: a.recall + b.recall,
        understand: a.understand + b.understand,
        scenario: a.scenario + b.scenario,
      }
    : a;

export function coverageTotals(rows: readonly MaterialCoverage[]): CoverageTotals {
  return rows.reduce<CoverageTotals>(
    (totals, row) => ({
      targets: addCounts(totals.targets, row.targets),
      approved: addCounts(totals.approved, row.approved),
      draft: addCounts(totals.draft, row.draft),
      missing: addCounts(totals.missing, row.missing),
    }),
    {
      targets: emptyDifficultyCounts(),
      approved: emptyDifficultyCounts(),
      draft: emptyDifficultyCounts(),
      missing: emptyDifficultyCounts(),
    },
  );
}

/** Whether a TARGET job for this material would generate anything. */
export function hasMissingQuestions(row: MaterialCoverage): boolean {
  return row.status === "READY" && row.targets !== null && sumCounts(row.missing) > 0;
}

export function isAnyDifficultyMissing(counts: ExamDifficultyCounts): boolean {
  return EXAM_DIFFICULTIES.some((d) => counts[d] > 0);
}

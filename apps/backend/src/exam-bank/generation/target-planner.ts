import {
  QUESTION_DIFFICULTIES,
  type QuestionDifficulty,
} from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import type { DifficultyCounts } from '../blueprint/exam-blueprint';
import {
  planGeneration,
  type PlannedRequest,
  type PlannerChunk,
} from './generation-planner';

/** Target jobs top up an exact gap, so they overshoot less than count jobs. */
export const TARGET_OVERSHOOT_RATIO = 1.1;

/**
 * Question types per difficulty: true/false mostly tests recall, multiple
 * choice mostly understanding, and scenarios are nearly always single choice.
 * Over a 40/30/30 bank this lands close to 65% single, 20% multiple, 15% T/F.
 */
export const DIFFICULTY_TYPE_MIX: Readonly<
  Record<QuestionDifficulty, TypeMix>
> = {
  recall: { single: 0.6, multiple: 0.1, boolean: 0.3 },
  understand: { single: 0.5, multiple: 0.4, boolean: 0.1 },
  scenario: { single: 0.85, multiple: 0.15, boolean: 0 },
};

export type MaterialGap = {
  materialId: number;
  /** Questions still missing per difficulty (never negative). */
  missing: DifficultyCounts;
};

export type TargetRequest = PlannedRequest & {
  difficulty: QuestionDifficulty;
};

export type TargetPlan = {
  requests: TargetRequest[];
  plannedCount: number;
  missingCount: number;
};

export function gapFor(
  target: DifficultyCounts,
  existing: DifficultyCounts,
): DifficultyCounts {
  return {
    recall: Math.max(0, target.recall - existing.recall),
    understand: Math.max(0, target.understand - existing.understand),
    scenario: Math.max(0, target.scenario - existing.scenario),
  };
}

/** One count-style plan per (material, difficulty) gap, over that material's chunks. */
export function planTargets(
  gaps: readonly MaterialGap[],
  chunksByMaterial: ReadonlyMap<number, PlannerChunk[]>,
): TargetPlan {
  const requests: TargetRequest[] = [];
  let missingCount = 0;
  for (const gap of gaps) {
    const chunks = chunksByMaterial.get(gap.materialId) ?? [];
    for (const difficulty of QUESTION_DIFFICULTIES) {
      const missing = gap.missing[difficulty];
      if (!missing) continue;
      missingCount += missing;
      const plan = planGeneration(
        chunks,
        missing,
        DIFFICULTY_TYPE_MIX[difficulty],
        TARGET_OVERSHOOT_RATIO,
      );
      requests.push(...plan.requests.map((r) => ({ ...r, difficulty })));
    }
  }
  const plannedCount = requests.reduce(
    (sum, r) => sum + r.quota.single + r.quota.multiple + r.quota.boolean,
    0,
  );
  return { requests, plannedCount, missingCount };
}

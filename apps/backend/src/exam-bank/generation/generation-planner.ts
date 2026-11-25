import {
  MAX_QUESTIONS_PER_REQUEST,
  QUESTION_TYPES,
  type QuestionType,
} from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import { largestRemainder } from './largest-remainder';

export const OVERSHOOT_RATIO = 1.2;
export const MIN_CHUNK_TOKENS = 120;
export const TOKENS_PER_QUESTION = 120;
export const DEFAULT_TYPE_MIX: TypeMix = {
  single: 0.5,
  multiple: 0.25,
  boolean: 0.25,
};

export type PlannerChunk = {
  id: number;
  tokenEstimate: number;
  existingCount: number;
  materialId?: number;
};

export type PlannedRequest = {
  chunkId: number;
  quota: TypeMix;
  variant: number;
  variantCount: number;
};

export type GenerationPlan = {
  requests: PlannedRequest[];
  plannedCount: number;
  maxPossible: number;
  isCapped: boolean;
};

export function emptyMix(): TypeMix {
  return { single: 0, multiple: 0, boolean: 0 };
}

export function mixTotal(mix: TypeMix): number {
  return QUESTION_TYPES.reduce((sum, type) => sum + mix[type], 0);
}

/** Spreads each type evenly over `count` slots (Bresenham-style interleave). */
export function interleaveTypes(totals: TypeMix): QuestionType[] {
  const count = mixTotal(totals);
  const assigned = emptyMix();
  const sequence: QuestionType[] = [];
  for (let i = 1; i <= count; i += 1) {
    const next = QUESTION_TYPES.filter((t) => assigned[t] < totals[t]).sort(
      (a, b) =>
        (totals[b] * i) / count -
        assigned[b] -
        ((totals[a] * i) / count - assigned[a]),
    )[0];
    assigned[next] += 1;
    sequence.push(next);
  }
  return sequence;
}

function chunkWeights(
  chunks: readonly PlannerChunk[],
  target: number,
): number[] {
  const tokenSum = chunks.reduce((sum, c) => sum + c.tokenEstimate, 0);
  const existingSum = chunks.reduce((sum, c) => sum + c.existingCount, 0);
  const deficits = chunks.map((c) =>
    Math.max(
      0,
      (c.tokenEstimate / tokenSum) * (existingSum + target) - c.existingCount,
    ),
  );
  return deficits.some((d) => d > 0)
    ? deficits
    : chunks.map((c) => c.tokenEstimate);
}

function splitIntoRequests(
  chunkId: number,
  types: QuestionType[],
): PlannedRequest[] {
  const variantCount = Math.ceil(types.length / MAX_QUESTIONS_PER_REQUEST);
  const quotas = Array.from({ length: variantCount }, emptyMix);
  types.forEach((type, i) => {
    quotas[i % variantCount][type] += 1;
  });
  return quotas.map((quota, variant) => ({
    chunkId,
    quota,
    variant,
    variantCount,
  }));
}

/**
 * Plans how many questions of each type to ask for per chunk. Overshoots the
 * requested count to absorb dedup/invalid losses, weights chunks by length,
 * favours chunks that are under-covered by the existing bank, and caps each
 * chunk to what its text can reasonably support.
 */
export function planGeneration(
  allChunks: readonly PlannerChunk[],
  requestedCount: number,
  typeMix: TypeMix = DEFAULT_TYPE_MIX,
  overshoot: number = OVERSHOOT_RATIO,
): GenerationPlan {
  const chunks = allChunks.filter((c) => c.tokenEstimate >= MIN_CHUNK_TOKENS);
  const caps = chunks.map((c) =>
    Math.ceil(c.tokenEstimate / TOKENS_PER_QUESTION),
  );
  const maxPossible = caps.reduce((sum, cap) => sum + cap, 0);
  const plannedCount = Math.min(
    Math.ceil(requestedCount * overshoot),
    maxPossible,
  );
  if (plannedCount === 0) {
    return {
      requests: [],
      plannedCount: 0,
      maxPossible,
      isCapped: maxPossible < requestedCount,
    };
  }

  const perChunk = largestRemainder(
    chunkWeights(chunks, plannedCount),
    plannedCount,
    caps,
  );
  const [single, multiple, boolean] = largestRemainder(
    QUESTION_TYPES.map((t) => typeMix[t]),
    plannedCount,
  );
  const sequence = interleaveTypes({ single, multiple, boolean });

  let cursor = 0;
  const requests = chunks.flatMap((chunk, i) => {
    const types = sequence.slice(cursor, cursor + perChunk[i]);
    cursor += perChunk[i];
    return types.length ? splitIntoRequests(chunk.id, types) : [];
  });
  return {
    requests,
    plannedCount,
    maxPossible,
    isCapped: maxPossible < requestedCount,
  };
}

/** Splits a quota in two (used to retry a request whose output was truncated). */
export function halveQuota(quota: TypeMix): TypeMix[] {
  const types = interleaveTypes(quota);
  if (types.length <= 1) return [quota];
  const halves = [emptyMix(), emptyMix()];
  types.forEach((type, i) => {
    halves[i % 2][type] += 1;
  });
  return halves;
}

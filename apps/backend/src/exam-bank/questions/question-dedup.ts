import { DUPLICATE_SIMILARITY } from '../exam-bank.constants';
import { maxSimilarity } from '../embeddings/vector-codec';
import { normalizePromptText } from './question-rules';

export type DedupContext = {
  vectors: Float32Array[];
  texts: Set<string>;
};

export type DedupOutcome<T> = {
  kept: Array<{ item: T; vector: Float32Array | null }>;
  duplicateCount: number;
};

/**
 * Drops candidates whose zh prompt matches an existing one exactly or whose
 * embedding is too close to the bank or to a candidate kept earlier. Kept
 * candidates are added to the context so later batches dedup against them.
 */
export function dedupCandidates<T extends { promptZh: string }>(
  candidates: readonly T[],
  vectors: ReadonlyArray<Float32Array | null>,
  context: DedupContext,
  threshold = DUPLICATE_SIMILARITY,
): DedupOutcome<T> {
  const kept: DedupOutcome<T>['kept'] = [];
  let duplicateCount = 0;
  candidates.forEach((item, i) => {
    const text = normalizePromptText(item.promptZh);
    const vector = vectors[i] ?? null;
    const isDuplicate =
      context.texts.has(text) ||
      (vector !== null && maxSimilarity(vector, context.vectors) > threshold);
    if (isDuplicate) {
      duplicateCount += 1;
      return;
    }
    context.texts.add(text);
    if (vector) context.vectors.push(vector);
    kept.push({ item, vector });
  });
  return { kept, duplicateCount };
}

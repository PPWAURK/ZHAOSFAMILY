import { dot } from './vector-codec';

export type IndexedChunk = {
  id: number;
  materialId: number;
  ordinal: number;
  content: string;
  tokenEstimate: number;
  vector: Float32Array | null;
};

export const RELATED_TOP_K = 2;
export const RELATED_MIN_SIMILARITY = 0.55;
export const RELATED_MAX_TOKENS = 1600;

/**
 * RAG context for one source chunk: its neighbours in the same document, then
 * the most similar chunks across the selected materials, within a token budget.
 */
export function selectRelatedChunks(
  target: IndexedChunk,
  index: readonly IndexedChunk[],
): IndexedChunk[] {
  const neighbours = index.filter(
    (c) =>
      c.materialId === target.materialId &&
      Math.abs(c.ordinal - target.ordinal) === 1,
  );
  const excluded = new Set([target.id, ...neighbours.map((c) => c.id)]);
  const similar = target.vector
    ? index
        .filter((c) => !excluded.has(c.id) && c.vector)
        .map((c) => ({ chunk: c, score: dot(target.vector!, c.vector!) }))
        .filter((s) => s.score >= RELATED_MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score)
        .slice(0, RELATED_TOP_K)
        .map((s) => s.chunk)
    : [];

  const selected: IndexedChunk[] = [];
  let tokens = 0;
  for (const chunk of [...neighbours, ...similar]) {
    if (tokens + chunk.tokenEstimate > RELATED_MAX_TOKENS) continue;
    selected.push(chunk);
    tokens += chunk.tokenEstimate;
  }
  return selected;
}

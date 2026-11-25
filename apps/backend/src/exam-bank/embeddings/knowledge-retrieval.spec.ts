import { selectRelatedChunks, type IndexedChunk } from './knowledge-retrieval';
import { normalizeVector } from './vector-codec';

const make = (
  id: number,
  materialId: number,
  ordinal: number,
  vector: number[] | null,
  tokenEstimate = 500,
): IndexedChunk => ({
  id,
  materialId,
  ordinal,
  content: `chunk ${id}`,
  tokenEstimate,
  vector: vector ? normalizeVector(vector) : null,
});

describe('selectRelatedChunks', () => {
  const target = make(1, 1, 5, [1, 0, 0]);
  const index = [
    target,
    make(2, 1, 4, [0, 1, 0]),
    make(3, 1, 6, [0, 0, 1]),
    make(4, 2, 0, [0.9, 0.1, 0]),
    make(5, 2, 1, [0.6, 0.8, 0]),
    make(6, 2, 2, [0, 1, 1]),
    make(7, 1, 9, [1, 0.05, 0]),
  ];

  it('returns neighbours first, then the most similar chunks above the threshold', () => {
    const ids = selectRelatedChunks(target, index).map((c) => c.id);
    expect(ids.slice(0, 2)).toEqual([2, 3]);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(6);
  });

  it('respects the token budget', () => {
    const big = [
      target,
      make(2, 1, 4, [0, 1, 0], 1500),
      make(3, 1, 6, [0, 0, 1], 500),
    ];
    expect(selectRelatedChunks(target, big).map((c) => c.id)).toEqual([2]);
  });

  it('falls back to neighbours only when the target has no vector', () => {
    const ids = selectRelatedChunks(make(1, 1, 5, null), index).map(
      (c) => c.id,
    );
    expect(ids).toEqual([2, 3]);
  });
});

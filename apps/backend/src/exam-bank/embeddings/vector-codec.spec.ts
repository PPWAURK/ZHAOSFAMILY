import {
  dot,
  maxSimilarity,
  normalizeVector,
  packVector,
  unpackVector,
} from './vector-codec';

describe('vector-codec', () => {
  it('normalises to unit length', () => {
    const vector = normalizeVector([3, 4]);
    expect(dot(vector, vector)).toBeCloseTo(1, 6);
    expect(Array.from(vector)).toEqual([
      expect.closeTo(0.6, 6),
      expect.closeTo(0.8, 6),
    ]);
  });

  it('round-trips through bytes, even from an unaligned slice', () => {
    const vector = normalizeVector([1, 2, 3, 4]);
    const packed = packVector(vector);
    const unaligned = Buffer.concat([Buffer.from([9]), packed]).subarray(1);
    expect(Array.from(unpackVector(unaligned))).toEqual(Array.from(vector));
  });

  it('dot product of normalised vectors equals cosine similarity', () => {
    expect(dot(normalizeVector([1, 0]), normalizeVector([0, 1]))).toBe(0);
    expect(dot(normalizeVector([1, 1]), normalizeVector([2, 2]))).toBeCloseTo(
      1,
      6,
    );
  });

  it('returns -1 for an empty pool and the best score otherwise', () => {
    const a = normalizeVector([1, 0]);
    expect(maxSimilarity(a, [])).toBe(-1);
    expect(
      maxSimilarity(a, [normalizeVector([0, 1]), normalizeVector([1, 0.1])]),
    ).toBeGreaterThan(0.99);
  });
});

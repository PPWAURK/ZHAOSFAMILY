import { normalizeVector } from '../embeddings/vector-codec';
import { dedupCandidates, type DedupContext } from './question-dedup';

const ctx = (): DedupContext => ({
  texts: new Set(['洗手需要多久']),
  vectors: [normalizeVector([1, 0, 0])],
});

describe('dedupCandidates', () => {
  it('drops exact text matches ignoring punctuation and spaces', () => {
    const result = dedupCandidates(
      [{ promptZh: '洗手 需要多久?' }],
      [null],
      ctx(),
    );
    expect(result.duplicateCount).toBe(1);
    expect(result.kept).toEqual([]);
  });

  it('drops candidates too similar to the bank and keeps distinct ones', () => {
    const result = dedupCandidates(
      [{ promptZh: 'A' }, { promptZh: 'B' }],
      [normalizeVector([1, 0.05, 0]), normalizeVector([0, 1, 0])],
      ctx(),
    );
    expect(result.duplicateCount).toBe(1);
    expect(result.kept.map((k) => k.item.promptZh)).toEqual(['B']);
  });

  it('dedups within the same job through the shared context', () => {
    const context = ctx();
    const result = dedupCandidates(
      [{ promptZh: 'A' }, { promptZh: 'B' }],
      [normalizeVector([0, 1, 0]), normalizeVector([0, 1, 0.01])],
      context,
    );
    expect(result.kept).toHaveLength(1);
    expect(context.vectors).toHaveLength(2);
    expect(context.texts.has('a')).toBe(true);
  });

  it('keeps candidates below the threshold', () => {
    const result = dedupCandidates(
      [{ promptZh: 'C' }],
      [normalizeVector([1, 1, 0])],
      ctx(),
      0.92,
    );
    expect(result.kept).toHaveLength(1);
  });
});

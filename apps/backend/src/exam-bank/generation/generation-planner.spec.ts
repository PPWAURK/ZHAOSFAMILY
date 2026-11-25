import {
  halveQuota,
  interleaveTypes,
  mixTotal,
  planGeneration,
  type PlannerChunk,
} from './generation-planner';
import { largestRemainder } from './largest-remainder';

const chunk = (
  id: number,
  tokenEstimate: number,
  existingCount = 0,
): PlannerChunk => ({
  id,
  tokenEstimate,
  existingCount,
});

describe('largestRemainder', () => {
  it('distributes exactly the total, proportionally', () => {
    expect(largestRemainder([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(largestRemainder([3, 1], 8)).toEqual([6, 2]);
  });

  it('respects caps and redistributes overflow', () => {
    expect(largestRemainder([10, 1, 1], 9, [3, 10, 10])).toEqual([3, 3, 3]);
  });

  it('stops at total capacity', () => {
    expect(largestRemainder([1, 1], 10, [2, 3])).toEqual([2, 3]);
  });
});

describe('interleaveTypes', () => {
  it('produces the exact counts spread across the sequence', () => {
    const sequence = interleaveTypes({ single: 4, multiple: 2, boolean: 2 });
    expect(sequence).toHaveLength(8);
    expect(sequence.filter((t) => t === 'single')).toHaveLength(4);
    expect(sequence.slice(0, 4)).toContain('multiple');
  });
});

describe('planGeneration', () => {
  const chunks = [chunk(1, 800), chunk(2, 800), chunk(3, 400), chunk(4, 50)];

  it('overshoots by 20% and makes type totals exact', () => {
    const plan = planGeneration(chunks, 10);
    const totals = plan.requests.reduce(
      (acc, r) => ({
        single: acc.single + r.quota.single,
        multiple: acc.multiple + r.quota.multiple,
        boolean: acc.boolean + r.quota.boolean,
      }),
      { single: 0, multiple: 0, boolean: 0 },
    );
    expect(plan.plannedCount).toBe(12);
    expect(mixTotal(totals)).toBe(12);
    expect(totals).toEqual({ single: 6, multiple: 3, boolean: 3 });
  });

  it('ignores tiny chunks and weights by length', () => {
    const plan = planGeneration(chunks, 10);
    const perChunk = new Map<number, number>();
    plan.requests.forEach((r) =>
      perChunk.set(
        r.chunkId,
        (perChunk.get(r.chunkId) ?? 0) + mixTotal(r.quota),
      ),
    );
    expect(perChunk.has(4)).toBe(false);
    expect(perChunk.get(1)).toBeGreaterThan(perChunk.get(3) ?? 0);
  });

  it('never puts more than 6 questions in a request', () => {
    const plan = planGeneration([chunk(1, 3000)], 20);
    plan.requests.forEach((r) =>
      expect(mixTotal(r.quota)).toBeLessThanOrEqual(6),
    );
    expect(plan.requests.map((r) => r.variant)).toEqual([0, 1, 2, 3]);
    expect(plan.requests.every((r) => r.variantCount === 4)).toBe(true);
  });

  it('caps the plan to what the material can support', () => {
    const plan = planGeneration([chunk(1, 240)], 100);
    expect(plan.maxPossible).toBe(2);
    expect(plan.plannedCount).toBe(2);
    expect(plan.isCapped).toBe(true);
  });

  it('favours chunks with fewer existing questions when topping up', () => {
    const plan = planGeneration([chunk(1, 800, 6), chunk(2, 800, 0)], 5);
    const forChunk = (id: number) =>
      plan.requests
        .filter((r) => r.chunkId === id)
        .reduce((s, r) => s + mixTotal(r.quota), 0);
    expect(forChunk(2)).toBeGreaterThan(forChunk(1));
  });

  it('returns an empty plan without eligible chunks', () => {
    expect(planGeneration([chunk(1, 10)], 10).requests).toEqual([]);
  });
});

describe('halveQuota', () => {
  it('splits a quota in two halves preserving totals', () => {
    const halves = halveQuota({ single: 3, multiple: 1, boolean: 1 });
    expect(halves).toHaveLength(2);
    expect(mixTotal(halves[0]) + mixTotal(halves[1])).toBe(5);
  });

  it('keeps a single question as is', () => {
    expect(halveQuota({ single: 1, multiple: 0, boolean: 0 })).toEqual([
      { single: 1, multiple: 0, boolean: 0 },
    ]);
  });
});

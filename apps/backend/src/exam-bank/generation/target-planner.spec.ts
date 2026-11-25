import type { PlannerChunk } from './generation-planner';
import {
  DIFFICULTY_TYPE_MIX,
  gapFor,
  planTargets,
  type MaterialGap,
} from './target-planner';

const chunk = (id: number, tokenEstimate = 2000): PlannerChunk => ({
  id,
  tokenEstimate,
  existingCount: 0,
});
const gap = (
  materialId: number,
  recall: number,
  understand: number,
  scenario: number,
): MaterialGap => ({ materialId, missing: { recall, understand, scenario } });

const sumQuota = (
  requests: ReturnType<typeof planTargets>['requests'],
  type: 'single' | 'multiple' | 'boolean',
) => requests.reduce((sum, r) => sum + r.quota[type], 0);

describe('gapFor', () => {
  it('returns what is still missing per difficulty', () => {
    expect(
      gapFor(
        { recall: 4, understand: 3, scenario: 3 },
        { recall: 1, understand: 3, scenario: 0 },
      ),
    ).toEqual({ recall: 3, understand: 0, scenario: 3 });
  });

  it('never goes negative when the bank already exceeds the target', () => {
    expect(
      gapFor(
        { recall: 2, understand: 0, scenario: 1 },
        { recall: 5, understand: 4, scenario: 1 },
      ),
    ).toEqual({ recall: 0, understand: 0, scenario: 0 });
  });
});

describe('planTargets', () => {
  it('attaches the difficulty of its gap to every request', () => {
    // Arrange
    const chunks = new Map([[1, [chunk(10), chunk(11)]]]);

    // Act
    const plan = planTargets([gap(1, 3, 0, 2)], chunks);

    // Assert
    const difficulties = new Set(plan.requests.map((r) => r.difficulty));
    expect(difficulties).toEqual(new Set(['recall', 'scenario']));
    expect(plan.requests.every((r) => [10, 11].includes(r.chunkId))).toBe(true);
  });

  it('uses the type mix of the difficulty, without true/false for scenarios', () => {
    const chunks = new Map([[1, [chunk(10), chunk(11), chunk(12)]]]);

    const plan = planTargets([gap(1, 0, 0, 20)], chunks);

    expect(DIFFICULTY_TYPE_MIX.scenario.boolean).toBe(0);
    expect(sumQuota(plan.requests, 'boolean')).toBe(0);
    expect(sumQuota(plan.requests, 'single')).toBeGreaterThan(
      sumQuota(plan.requests, 'multiple'),
    );
  });

  it('asks for true/false questions mostly at the recall level', () => {
    const chunks = new Map([[1, [chunk(10), chunk(11), chunk(12)]]]);

    const recall = planTargets([gap(1, 20, 0, 0)], chunks).requests;
    const understand = planTargets([gap(1, 0, 20, 0)], chunks).requests;

    expect(sumQuota(recall, 'boolean')).toBeGreaterThan(
      sumQuota(understand, 'boolean'),
    );
    expect(sumQuota(understand, 'multiple')).toBeGreaterThan(
      sumQuota(recall, 'multiple'),
    );
  });

  it('overshoots each gap a little to absorb losses', () => {
    const chunks = new Map([[1, [chunk(10), chunk(11), chunk(12)]]]);
    const plan = planTargets([gap(1, 10, 0, 0)], chunks);
    expect(plan.plannedCount).toBe(11);
  });

  it('skips materials without usable chunks but still counts their gap', () => {
    // Arrange: material 2 has no chunks, material 3 only a too-short one.
    const chunks = new Map([
      [1, [chunk(10)]],
      [3, [chunk(30, 10)]],
    ]);

    // Act
    const plan = planTargets(
      [gap(1, 2, 0, 0), gap(2, 1, 1, 1), gap(3, 0, 4, 0)],
      chunks,
    );

    // Assert
    expect(plan.requests.every((r) => r.chunkId === 10)).toBe(true);
    expect(plan.missingCount).toBe(9);
  });

  it('sums the gaps into missingCount and plans nothing for empty gaps', () => {
    const chunks = new Map([[1, [chunk(10)]]]);
    expect(planTargets([gap(1, 0, 0, 0)], chunks)).toEqual({
      requests: [],
      plannedCount: 0,
      missingCount: 0,
    });
    expect(
      planTargets([gap(1, 1, 2, 3), gap(4, 1, 0, 0)], chunks).missingCount,
    ).toBe(7);
  });
});

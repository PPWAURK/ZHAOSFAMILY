import type { QuestionDifficulty, QuestionType } from '../exam-bank.constants';
import {
  allocateTypes,
  drawBlueprint,
  normalizeKnowledgePoint,
  type DrawCandidate,
  type DrawCell,
} from './blueprint-draw';
import { validateBlueprint, type ExamBlueprint } from './exam-blueprint';

let nextId = 1;
function bank(
  materialId: number,
  spec: Array<[QuestionType, QuestionDifficulty, number]>,
  pointPrefix: string | null = null,
): DrawCandidate[] {
  return spec.flatMap(([type, difficulty, count]) =>
    Array.from({ length: count }, () => {
      const id = nextId++;
      return {
        id,
        type,
        difficulty,
        materialId,
        knowledgePoint: pointPrefix ? `${pointPrefix}-${id}` : null,
      };
    }),
  );
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const blueprint: ExamBlueprint = {
  breakMinutes: 15,
  rules: [{ categoryId: 1, maxWrong: 1 }],
  sections: [
    {
      titleZh: '上场',
      titleFr: 'Partie 1',
      timeLimitMinutes: 30,
      typeCounts: { single: 3, multiple: 1, boolean: 1 },
      items: [
        {
          materialId: 1,
          count: 3,
          difficulty: { recall: 1, understand: 1, scenario: 1 },
        },
        { materialId: 2, count: 2, difficulty: null },
      ],
    },
    {
      titleZh: '下场',
      titleFr: 'Partie 2',
      timeLimitMinutes: 30,
      typeCounts: { single: 1, multiple: 0, boolean: 1 },
      items: [{ materialId: 3, count: 2, difficulty: null }],
    },
  ],
};

const fullBank = (): DrawCandidate[] => [
  ...bank(1, [
    ['single', 'recall', 2],
    ['boolean', 'recall', 2],
    ['multiple', 'understand', 2],
    ['single', 'scenario', 3],
  ]),
  ...bank(2, [
    ['single', 'recall', 3],
    ['boolean', 'understand', 2],
  ]),
  ...bank(3, [
    ['single', 'scenario', 2],
    ['boolean', 'recall', 2],
  ]),
];

describe('validateBlueprint', () => {
  it('accepts a consistent blueprint', () => {
    expect(validateBlueprint(blueprint)).toBeNull();
  });

  it('rejects a section whose type counts do not add up', () => {
    const broken = structuredClone(blueprint);
    broken.sections[1].typeCounts.single = 2;
    expect(validateBlueprint(broken)).toBe('EXAM_BLUEPRINT_TYPE_MISMATCH');
  });

  it('rejects a difficulty split that does not match the item count', () => {
    const broken = structuredClone(blueprint);
    broken.sections[0].items[0].difficulty!.scenario = 2;
    expect(validateBlueprint(broken)).toBe(
      'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH',
    );
  });

  it('rejects a material used twice', () => {
    const broken = structuredClone(blueprint);
    broken.sections[1].items[0].materialId = 1;
    expect(validateBlueprint(broken)).toBe('EXAM_BLUEPRINT_DUPLICATE_MATERIAL');
  });
});

describe('allocateTypes', () => {
  const cell = (
    spec: Array<[QuestionType, number]>,
    need: number,
  ): DrawCell => ({
    materialId: 1,
    difficulty: null,
    need,
    candidates: spec.flatMap(([type, n]) => bank(1, [[type, 'recall', n]])),
  });

  it('moves another cell off a full type when that is the only way', () => {
    // Cell A could be single or boolean; cell B can only be single.
    const cells = [
      cell(
        [
          ['single', 1],
          ['boolean', 1],
        ],
        1,
      ),
      cell([['single', 1]], 1),
    ];
    for (let seed = 1; seed < 20; seed += 1) {
      const quotas = allocateTypes(
        cells,
        { single: 1, multiple: 0, boolean: 1 },
        seeded(seed),
      );
      expect(quotas).toEqual([
        { single: 0, multiple: 0, boolean: 1 },
        { single: 1, multiple: 0, boolean: 0 },
      ]);
    }
  });

  it('returns null when the type totals cannot be met', () => {
    const cells = [cell([['single', 3]], 2)];
    expect(
      allocateTypes(cells, { single: 1, multiple: 0, boolean: 1 }),
    ).toBeNull();
  });
});

describe('drawBlueprint', () => {
  it('meets every per-file, per-difficulty and per-type quota', () => {
    const candidates = fullBank();
    const byId = new Map(candidates.map((c) => [c.id, c]));
    for (let seed = 1; seed < 30; seed += 1) {
      const draw = drawBlueprint(blueprint, candidates, seeded(seed))!;
      const [first, second] = draw.sections.map((ids) =>
        ids.map((id) => byId.get(id)!),
      );
      const count = (
        list: DrawCandidate[],
        key: keyof DrawCandidate,
        value: unknown,
      ) => list.filter((c) => c[key] === value).length;

      expect(first).toHaveLength(5);
      expect(count(first, 'type', 'single')).toBe(3);
      expect(count(first, 'type', 'multiple')).toBe(1);
      expect(count(first, 'type', 'boolean')).toBe(1);
      const fromOne = first.filter((c) => c.materialId === 1);
      expect(fromOne.map((c) => c.difficulty).sort()).toEqual([
        'recall',
        'scenario',
        'understand',
      ]);
      expect(count(first, 'materialId', 2)).toBe(2);
      expect(second.map((c) => c.type).sort()).toEqual(['boolean', 'single']);
      expect(new Set([...draw.sections.flat()]).size).toBe(7);
    }
  });

  it('never puts two questions on the same knowledge point when it can avoid it', () => {
    const candidates = fullBank().map((c, i) => ({
      ...c,
      // Pairs of questions share a knowledge point.
      knowledgePoint: `point ${Math.floor(i / 2)}`,
    }));
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const draw = drawBlueprint(blueprint, candidates, seeded(7))!;
    const points = draw.sections
      .flat()
      .map((id) => byId.get(id)!.knowledgePoint);
    expect(new Set(points).size).toBe(points.length);
    expect(draw.isKnowledgePointRelaxed).toBe(false);
  });

  it('relaxes the knowledge-point rule rather than refusing the paper', () => {
    const candidates = fullBank().map((c) => ({
      ...c,
      knowledgePoint: 'same',
    }));
    const draw = drawBlueprint(blueprint, candidates, seeded(3));
    expect(draw?.isKnowledgePointRelaxed).toBe(true);
  });

  it('returns null when a file has too few questions of a difficulty', () => {
    const candidates = fullBank().filter(
      (c) => !(c.materialId === 1 && c.difficulty === 'scenario'),
    );
    expect(drawBlueprint(blueprint, candidates)).toBeNull();
  });
});

describe('normalizeKnowledgePoint', () => {
  it('ignores spacing, punctuation and case', () => {
    expect(normalizeKnowledgePoint(' 冷冻肉 化冻！')).toBe(
      normalizeKnowledgePoint('冷冻肉化冻'),
    );
    expect(normalizeKnowledgePoint('  ')).toBeNull();
  });
});

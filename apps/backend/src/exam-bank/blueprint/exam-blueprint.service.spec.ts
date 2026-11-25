import { BadRequestException } from '@nestjs/common';
import { ExamBlueprintService } from './exam-blueprint.service';
import type { BlueprintSection, ExamBlueprint } from './exam-blueprint';

type BankRow = {
  id: number;
  type: string;
  difficulty: string;
  sourceMaterialId: number;
  knowledgePoint: string | null;
};

let nextId = 1;
const rows = (
  materialId: number,
  type: string,
  difficulty: string,
  count: number,
): BankRow[] =>
  Array.from({ length: count }, () => ({
    id: nextId++,
    type,
    difficulty,
    sourceMaterialId: materialId,
    knowledgePoint: null,
  }));

const section = (
  typeCounts: BlueprintSection['typeCounts'],
): BlueprintSection => ({
  titleZh: '上场',
  titleFr: 'Partie 1',
  timeLimitMinutes: 30,
  typeCounts,
  items: [
    {
      materialId: 1,
      count: 2,
      difficulty: { recall: 1, understand: 1, scenario: 0 },
    },
    { materialId: 2, count: 1, difficulty: null },
  ],
});
const blueprint = (
  typeCounts: BlueprintSection['typeCounts'] = {
    single: 2,
    multiple: 1,
    boolean: 0,
  },
): ExamBlueprint => ({
  sections: [section(typeCounts)],
  breakMinutes: 0,
  rules: [{ categoryId: 7, maxWrong: 1 }],
});

function buildService(bank: BankRow[]) {
  const prisma = {
    examQuestion: { findMany: jest.fn().mockResolvedValue(bank) },
    examKnowledgeMaterial: {
      findMany: jest.fn().mockResolvedValue([{ id: 1, title: '红线制度' }]),
      count: jest.fn().mockResolvedValue(2),
    },
    examCategory: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 7, nameZh: '企业文化', nameFr: 'Culture' }]),
    },
  };
  return { service: new ExamBlueprintService(prisma as never), prisma };
}

const FULL_BANK = () => [
  ...rows(1, 'single', 'recall', 2),
  ...rows(1, 'multiple', 'understand', 1),
  ...rows(2, 'single', 'scenario', 3),
];

describe('ExamBlueprintService.check', () => {
  it('reports required and available APPROVED questions per difficulty cell', async () => {
    // Arrange
    const { service, prisma } = buildService(FULL_BANK());

    // Act
    const check = await service.check(blueprint());

    // Assert
    expect(prisma.examQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'APPROVED', sourceMaterialId: { in: [1, 2] } },
      }) as unknown,
    );
    expect(check.isSufficient).toBe(true);
    const [only] = check.sections;
    expect(only.isTypeMixFeasible).toBe(true);
    expect(only.requiredTypes).toEqual({ single: 2, multiple: 1, boolean: 0 });
    expect(only.items).toEqual([
      {
        materialId: 1,
        materialTitle: '红线制度',
        count: 2,
        isSufficient: true,
        cells: [
          { difficulty: 'recall', required: 1, available: 2 },
          { difficulty: 'understand', required: 1, available: 1 },
        ],
      },
      {
        materialId: 2,
        materialTitle: null,
        count: 1,
        isSufficient: true,
        cells: [{ difficulty: null, required: 1, available: 3 }],
      },
    ]);
  });

  it('flags a file whose difficulty cell cannot be filled', async () => {
    const { service } = buildService([
      ...rows(1, 'single', 'recall', 2),
      ...rows(2, 'single', 'scenario', 3),
    ]);

    const check = await service.check(blueprint());

    const [item] = check.sections[0].items;
    expect(item.isSufficient).toBe(false);
    expect(item.cells[1]).toEqual({
      difficulty: 'understand',
      required: 1,
      available: 0,
    });
    expect(check.sections[0].isTypeMixFeasible).toBe(false);
    expect(check.isSufficient).toBe(false);
  });

  it('reports an infeasible type mix when every file has enough questions', async () => {
    // Arrange: the section wants a true/false question but the files have none.
    const { service } = buildService(FULL_BANK());

    // Act
    const check = await service.check(
      blueprint({ single: 2, multiple: 0, boolean: 1 }),
    );

    // Assert
    expect(check.sections[0].items.every((i) => i.isSufficient)).toBe(true);
    expect(check.sections[0].isTypeMixFeasible).toBe(false);
    expect(check.isSufficient).toBe(false);
  });
});

describe('ExamBlueprintService.assertValid', () => {
  it('rejects structural errors before touching the database', async () => {
    const { service, prisma } = buildService([]);
    await expect(
      service.assertValid({ ...blueprint(), sections: [] }),
    ).rejects.toEqual(
      new BadRequestException('EXAM_BLUEPRINT_SECTION_COUNT_INVALID'),
    );
    expect(prisma.examKnowledgeMaterial.count).not.toHaveBeenCalled();
  });

  it('rejects unknown materials and unknown rule categories', async () => {
    const missingMaterial = buildService([]);
    missingMaterial.prisma.examKnowledgeMaterial.count.mockResolvedValue(1);
    await expect(
      missingMaterial.service.assertValid(blueprint()),
    ).rejects.toEqual(
      new BadRequestException('EXAM_BLUEPRINT_MATERIAL_INVALID'),
    );

    const missingCategory = buildService([]);
    missingCategory.prisma.examCategory.count.mockResolvedValue(0);
    await expect(
      missingCategory.service.assertValid(blueprint()),
    ).rejects.toEqual(new BadRequestException('EXAM_BLUEPRINT_RULE_INVALID'));
  });
});

describe('ExamBlueprintService.ruleLabels', () => {
  it('labels each rule with its category names', async () => {
    const { service } = buildService([]);
    await expect(service.ruleLabels(blueprint())).resolves.toEqual([
      { categoryId: 7, maxWrong: 1, labelZh: '企业文化', labelFr: 'Culture' },
    ]);
  });
});

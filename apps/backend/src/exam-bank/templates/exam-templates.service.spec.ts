import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExamTemplatesService } from './exam-templates.service';
import { poolWhere } from './template-pool';
import { callArg } from '../spec-helpers.testspec';
import type { ExamBlueprintDto } from '../blueprint/dto/exam-blueprint.dto';

const NOW = new Date('2026-11-18T10:00:00Z');
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  titleZh: '考试',
  titleFr: 'Examen',
  descriptionZh: null,
  descriptionFr: null,
  singleCount: 5,
  multipleCount: 0,
  booleanCount: 0,
  categoryIds: null,
  materialIds: null,
  difficulties: null,
  blueprint: null,
  timeLimitMinutes: null,
  passingScore: 80,
  maxAttempts: null,
  shuffleOptions: true,
  showExplanations: true,
  isActive: false,
  createdAt: NOW,
  updatedAt: NOW,
  _count: { attempts: 0 },
  ...overrides,
});

function buildService(available = 10, isBlueprintFillable = true) {
  const prisma = {
    examTemplate: {
      findMany: jest.fn().mockResolvedValue([row({ _count: { attempts: 3 } })]),
      findUnique: jest.fn().mockResolvedValue(row()),
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(row(args.data)),
      ),
      update: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(row(args.data)),
      ),
      delete: jest.fn(),
    },
    examQuestion: { count: jest.fn().mockResolvedValue(available) },
    examAttempt: { count: jest.fn().mockResolvedValue(0) },
  };
  const blueprints = {
    assertValid: jest.fn().mockResolvedValue(undefined),
    check: jest.fn().mockResolvedValue({
      isSufficient: isBlueprintFillable,
      sections: [],
    }),
  };
  return {
    service: new ExamTemplatesService(prisma as never, blueprints as never),
    prisma,
    blueprints,
  };
}

const BLUEPRINT: ExamBlueprintDto = {
  breakMinutes: 15,
  rules: [{ categoryId: 7, maxWrong: 1 }],
  sections: [
    {
      titleZh: ' 上场 ',
      titleFr: 'Partie 1',
      timeLimitMinutes: 30,
      typeCounts: { single: 3, multiple: 1, boolean: 1 },
      items: [{ materialId: 1, count: 5, difficulty: null }],
    },
    {
      titleZh: '下场',
      titleFr: 'Partie 2',
      timeLimitMinutes: 20,
      typeCounts: { single: 2, multiple: 1, boolean: 2 },
      items: [
        {
          materialId: 2,
          count: 5,
          difficulty: { recall: 2, understand: 2, scenario: 1 },
        },
      ],
    },
  ],
};

type CreateArgs = { data: Record<string, unknown> };

describe('poolWhere', () => {
  it('only draws APPROVED questions and ignores empty filters', () => {
    expect(
      poolWhere(
        { categoryIds: [], materialIds: [2], difficulties: null },
        'single',
      ),
    ).toEqual({
      status: 'APPROVED',
      type: 'single',
      sourceMaterialId: { in: [2] },
    });
  });
});

describe('ExamTemplatesService', () => {
  it('lists templates with their attempt count', async () => {
    const [view] = await buildService().service.list();
    expect(view.attemptCount).toBe(3);
    expect(view.questionCount).toBe(5);
  });

  it('requires titles and at least one question', async () => {
    const { service } = buildService();
    await expect(
      service.create({ titleZh: '', titleFr: 'x', singleCount: 1 }, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ titleZh: 'x', titleFr: 'x' }, 1),
    ).rejects.toEqual(new BadRequestException('EXAM_TEMPLATE_EMPTY'));
  });

  it('stores empty filter lists as NULL', async () => {
    const { service, prisma } = buildService();
    await service.create(
      { titleZh: '考试', titleFr: 'Examen', singleCount: 2, categoryIds: [] },
      1,
    );
    expect(prisma.examTemplate.create.mock.calls[0][0].data.categoryIds).toBe(
      Prisma.DbNull,
    );
  });

  it('blocks activation when the pool cannot fill the template', async () => {
    const { service } = buildService(3);
    await expect(service.update(1, { isActive: true })).rejects.toEqual(
      new ConflictException('EXAM_POOL_INSUFFICIENT'),
    );
  });

  it('activates when the pool is large enough', async () => {
    const { service, prisma } = buildService(10);
    await service.update(1, { isActive: true });
    expect(prisma.examTemplate.update.mock.calls[0][0].data.isActive).toBe(
      true,
    );
  });

  it('reports pool availability per type', async () => {
    const { service } = buildService(4);
    await expect(
      service.poolCheck({ singleCount: 5, booleanCount: 2 }),
    ).resolves.toEqual({
      requested: { single: 5, multiple: 0, boolean: 2 },
      available: { single: 4, multiple: 4, boolean: 4 },
      isSufficient: false,
    });
  });

  it('refuses to delete a template that has attempts', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.count.mockResolvedValue(1);
    await expect(service.remove(1)).rejects.toEqual(
      new ConflictException('EXAM_TEMPLATE_HAS_ATTEMPTS'),
    );
  });

  it('derives counts and time limit from a blueprint and clears the filters', async () => {
    // Arrange
    const { service, prisma, blueprints } = buildService();

    // Act
    const view = await service.create(
      {
        titleZh: '店长科目一',
        titleFr: 'Examen gérant',
        singleCount: 99,
        timeLimitMinutes: 5,
        categoryIds: [3],
        materialIds: [4],
        difficulties: ['recall'],
        blueprint: BLUEPRINT,
      },
      1,
    );

    // Assert
    expect(blueprints.assertValid).toHaveBeenCalledTimes(1);
    const { data } = callArg<CreateArgs>(prisma.examTemplate.create);
    expect(data).toEqual(
      expect.objectContaining({
        singleCount: 5,
        multipleCount: 2,
        booleanCount: 3,
        timeLimitMinutes: 50,
        categoryIds: Prisma.DbNull,
        materialIds: Prisma.DbNull,
        difficulties: Prisma.DbNull,
      }) as unknown,
    );
    expect(data.blueprint).toEqual(
      expect.objectContaining({
        breakMinutes: 15,
        rules: [{ categoryId: 7, maxWrong: 1 }],
      }) as unknown,
    );
    expect(view.sectionCount).toBe(2);
    expect(view.questionCount).toBe(10);
  });

  it('has no overall time limit when a blueprint section is untimed', async () => {
    const { service, prisma } = buildService();
    const [first, second] = BLUEPRINT.sections;
    await service.create(
      {
        titleZh: '考试',
        titleFr: 'Examen',
        blueprint: {
          ...BLUEPRINT,
          sections: [first, { ...second, timeLimitMinutes: null }],
        },
      },
      1,
    );
    expect(
      callArg<CreateArgs>(prisma.examTemplate.create).data.timeLimitMinutes,
    ).toBeNull();
  });

  it('refuses to activate a blueprint the bank cannot fill', async () => {
    // Arrange
    const { service, prisma, blueprints } = buildService(10, false);

    // Act + Assert
    await expect(
      service.create(
        {
          titleZh: '考试',
          titleFr: 'Examen',
          isActive: true,
          blueprint: BLUEPRINT,
        },
        1,
      ),
    ).rejects.toEqual(new ConflictException('EXAM_POOL_INSUFFICIENT'));
    expect(blueprints.check).toHaveBeenCalledTimes(1);
    expect(prisma.examQuestion.count).not.toHaveBeenCalled();
    expect(prisma.examTemplate.create).not.toHaveBeenCalled();
  });

  it('checks the stored blueprint when activating an existing template', async () => {
    const { service, prisma, blueprints } = buildService(10, false);
    prisma.examTemplate.findUnique.mockResolvedValue(
      row({ blueprint: BLUEPRINT }),
    );
    await expect(service.update(1, { isActive: true })).rejects.toEqual(
      new ConflictException('EXAM_POOL_INSUFFICIENT'),
    );
    expect(blueprints.check).toHaveBeenCalledTimes(1);
  });

  it('keeps blueprint-derived counts when other fields are edited', async () => {
    const { service, prisma } = buildService();
    prisma.examTemplate.findUnique.mockResolvedValue(
      row({ blueprint: BLUEPRINT }),
    );

    await service.update(1, { singleCount: 3, timeLimitMinutes: 5 });

    const { data } = callArg<CreateArgs>(prisma.examTemplate.update);
    expect(data.singleCount).toBe(5);
    expect(data.booleanCount).toBe(3);
    expect(data.timeLimitMinutes).toBe(50);
    expect(data.categoryIds).toBe(Prisma.DbNull);
  });

  it('switches back to simple mode with a null blueprint', async () => {
    const { service, prisma } = buildService();
    prisma.examTemplate.findUnique.mockResolvedValue(
      row({ blueprint: { sections: [], breakMinutes: 0, rules: [] } }),
    );
    await service.update(1, { blueprint: null, singleCount: 3 });
    const { data } = callArg<CreateArgs>(prisma.examTemplate.update);
    expect(data.blueprint).toBe(Prisma.DbNull);
    expect(data.singleCount).toBe(3);
  });

  it('tells whether a stored template can be drawn in either mode', async () => {
    const simple = buildService(3);
    await expect(
      simple.service.isFillable(row({ singleCount: 5 }) as never),
    ).resolves.toBe(false);
    expect(simple.blueprints.check).not.toHaveBeenCalled();

    const sectioned = buildService(0, true);
    await expect(
      sectioned.service.isFillable(
        row({
          blueprint: { sections: [], breakMinutes: 0, rules: [] },
        }) as never,
      ),
    ).resolves.toBe(true);
    expect(sectioned.blueprints.check).toHaveBeenCalledTimes(1);
    expect(sectioned.prisma.examQuestion.count).not.toHaveBeenCalled();
  });
});

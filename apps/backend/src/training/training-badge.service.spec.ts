import { TrainingBadgeService } from './training-badge.service';

const BADGE_ROW = {
  code: 'general_onboarding_certification',
  nameZh: '入职培训完成认证',
  nameEn: 'Onboarding Certification',
  nameFr: 'Certification integration',
  descriptionZh: null,
  descriptionEn: null,
  descriptionFr: null,
  track: 'general',
  rarity: 'common',
  level: null,
  iconType: 'training',
  requiredScore: 80,
  requiredCompletionRate: 100,
  isActive: true,
  sortOrder: 10,
  requirements: [
    {
      materialId: 1,
      sortOrder: 0,
      material: {
        id: 1,
        title: 'Safety',
        positionId: 'ALL',
        type: 'PDF',
        quiz: null,
      },
    },
    {
      materialId: 2,
      sortOrder: 1,
      material: {
        id: 2,
        title: 'Safety Quiz',
        positionId: 'ALL',
        type: 'QUIZ',
        quiz: { id: 9 },
      },
    },
  ],
};

describe('TrainingBadgeService', () => {
  function createService() {
    const prismaService = {
      trainingBadge: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      trainingMaterial: {
        count: jest.fn(),
      },
      trainingMaterialProgress: {
        findMany: jest.fn(),
      },
      trainingQuizAttempt: {
        findMany: jest.fn(),
      },
      userTrainingBadge: {
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prismaService.$transaction.mockImplementation(
      (
        callback: (tx: {
          trainingBadgeRequirement: {
            deleteMany: jest.Mock;
            createMany: jest.Mock;
          };
        }) => unknown,
      ) =>
        callback({
          trainingBadgeRequirement: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        }),
    );

    return {
      prismaService,
      service: new TrainingBadgeService(prismaService as never),
    };
  }

  it('grants a badge after all material and quiz requirements are met', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingBadge.findMany.mockResolvedValue([BADGE_ROW]);
    prismaService.userTrainingBadge.findMany.mockResolvedValue([]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      { materialId: 1 },
      { materialId: 2 },
    ]);
    prismaService.trainingQuizAttempt.findMany.mockResolvedValue([
      { score: 88, passed: true, quiz: { materialId: 2 } },
    ]);
    prismaService.userTrainingBadge.createMany.mockResolvedValue({ count: 1 });

    await expect(service.evaluateForMaterial(7, 2)).resolves.toMatchObject([
      {
        code: 'general_onboarding_certification',
        status: 'certified',
        progress: 2,
        maxProgress: 2,
        score: 88,
      },
    ]);
    expect(prismaService.userTrainingBadge.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 7,
          badgeCode: 'general_onboarding_certification',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('does not grant badges with empty requirements', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingBadge.findMany.mockResolvedValue([
      { ...BADGE_ROW, requirements: [] },
    ]);
    prismaService.userTrainingBadge.findMany.mockResolvedValue([]);

    await expect(service.evaluateForMaterial(7, 2)).resolves.toEqual([]);
    expect(prismaService.userTrainingBadge.createMany).not.toHaveBeenCalled();
  });

  it('does not grant the same badge twice', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingBadge.findMany.mockResolvedValue([BADGE_ROW]);
    prismaService.userTrainingBadge.findMany.mockResolvedValue([
      { badgeCode: 'general_onboarding_certification' },
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      { materialId: 1 },
      { materialId: 2 },
    ]);
    prismaService.trainingQuizAttempt.findMany.mockResolvedValue([
      { score: 88, passed: true, quiz: { materialId: 2 } },
    ]);

    await expect(service.evaluateForMaterial(7, 2)).resolves.toEqual([]);
    expect(prismaService.userTrainingBadge.createMany).not.toHaveBeenCalled();
  });

  it('keeps badge locked when quiz score is below the badge threshold', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingBadge.findMany.mockResolvedValue([BADGE_ROW]);
    prismaService.userTrainingBadge.findMany.mockResolvedValue([]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      { materialId: 1 },
      { materialId: 2 },
    ]);
    prismaService.trainingQuizAttempt.findMany.mockResolvedValue([
      { score: 72, passed: true, quiz: { materialId: 2 } },
    ]);

    await expect(service.evaluateForMaterial(7, 2)).resolves.toEqual([]);
    expect(prismaService.userTrainingBadge.createMany).not.toHaveBeenCalled();
  });
});

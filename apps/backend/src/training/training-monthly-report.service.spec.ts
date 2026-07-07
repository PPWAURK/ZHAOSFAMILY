import { TrainingMonthlyReportService } from './training-monthly-report.service';

describe('TrainingMonthlyReportService', () => {
  function createService() {
    const prismaService = {
      trainingPosition: {
        findMany: jest.fn(),
      },
      trainingJobRolePosition: {
        findMany: jest.fn(),
      },
      trainingMaterial: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      trainingMaterialProgress: {
        findMany: jest.fn(),
      },
      trainingQuizAttempt: {
        findMany: jest.fn(),
      },
      userTrainingBadge: {
        findMany: jest.fn(),
      },
      legacyUserManagedRestaurant: {
        findMany: jest.fn(),
      },
      restaurant: {
        findUnique: jest.fn(),
      },
    };

    return {
      prismaService,
      service: new TrainingMonthlyReportService(prismaService as never),
    };
  }

  it('aggregates only monthly attempts, completions, and badges inside the range', async () => {
    const { service, prismaService } = createService();
    prismaService.trainingPosition.findMany.mockResolvedValue([
      { code: 'ALL', parentCode: null },
      { code: 'FRONT_HOST', parentCode: null },
    ]);
    prismaService.trainingJobRolePosition.findMany.mockResolvedValue([
      {
        jobRole: 'front-host',
        positionCode: 'FRONT_HOST',
        includeDescendants: false,
        grantsAllPositions: false,
      },
    ]);
    prismaService.trainingMaterial.findMany.mockResolvedValue([
      { id: 1, positionId: 'ALL' },
      { id: 2, positionId: 'FRONT_HOST' },
    ]);
    prismaService.user.findMany.mockResolvedValue([
      {
        id: 7,
        name: 'A Li',
        email: 'a@example.com',
        jobRole: 'front-host',
        restaurant: { id: 3, name: 'ZHAO Test' },
      },
    ]);
    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      {
        userId: 7,
        materialId: 1,
        completedAt: new Date('2026-07-10T12:00:00.000Z'),
      },
      {
        userId: 7,
        materialId: 2,
        completedAt: new Date('2026-06-30T23:59:59.000Z'),
      },
    ]);
    prismaService.trainingQuizAttempt.findMany.mockResolvedValue([
      {
        userId: 7,
        score: 90,
        passed: true,
        createdAt: new Date('2026-07-11T12:00:00.000Z'),
        quiz: { materialId: 2 },
      },
    ]);
    prismaService.userTrainingBadge.findMany.mockResolvedValue([
      {
        userId: 7,
        earnedAt: new Date('2026-07-12T12:00:00.000Z'),
        badge: {
          code: 'general_onboarding_certification',
          nameZh: '入职培训完成认证',
          nameEn: 'Onboarding Certification',
          nameFr: 'Certification integration',
        },
      },
    ]);

    await expect(
      service.getMonthlyReport(
        {
          id: 1,
          jobRole: 'holding',
          restaurantId: 1,
          store: { id: 1, name: 'HQ' },
        },
        '2026-07',
        undefined,
      ),
    ).resolves.toMatchObject({
      month: '2026-07',
      summary: {
        employeeCount: 1,
        completedEmployeeCount: 1,
        completedThisMonth: 1,
        quizAttemptCount: 1,
        quizPassedCount: 1,
        quizPassRate: 100,
        averageBestScore: 90,
        newBadgeCount: 1,
      },
      users: [
        {
          userId: 7,
          requiredTotal: 2,
          requiredCompleted: 2,
          completionPercent: 100,
          completedThisMonth: 1,
          quizAttemptCount: 1,
          newBadgeCount: 1,
        },
      ],
    });
    type FindAttempts = (input: {
      where: {
        createdAt: {
          gte: Date;
          lt: Date;
        };
      };
    }) => Promise<unknown>;
    const findAttemptsMock = prismaService.trainingQuizAttempt
      .findMany as jest.MockedFunction<FindAttempts>;
    const findManyCall = findAttemptsMock.mock.calls[0]?.[0];

    expect(findManyCall.where.createdAt).toEqual({
      gte: new Date('2026-07-01T00:00:00.000Z'),
      lt: new Date('2026-08-01T00:00:00.000Z'),
    });
  });
});

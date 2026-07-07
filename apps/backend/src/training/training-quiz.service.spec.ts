import { TrainingQuizService } from './training-quiz.service';

describe('TrainingQuizService.getMyRecords', () => {
  function createService() {
    const prismaService = {
      trainingMaterialProgress: {
        findMany: jest.fn(),
      },
      trainingQuizAttempt: {
        findMany: jest.fn(),
      },
    };
    const titleService = {
      listEarnedTitles: jest.fn().mockResolvedValue([]),
    };
    const badgeService = {
      evaluateForMaterial: jest.fn().mockResolvedValue([]),
    };

    return {
      prismaService,
      titleService,
      badgeService,
      service: new TrainingQuizService(
        prismaService as never,
        titleService as never,
        badgeService as never,
      ),
    };
  }

  it('includes material archive fields and quiz metadata', async () => {
    const { service, prismaService, titleService } = createService();
    const completedAtLater = new Date('2026-05-06T10:00:00.000Z');
    const completedAtMiddle = new Date('2026-05-05T15:00:00.000Z');
    const completedAtEarlier = new Date('2026-05-05T10:00:00.000Z');

    prismaService.trainingMaterialProgress.findMany.mockResolvedValue([
      {
        materialId: 12,
        completedAt: completedAtLater,
        material: {
          title: 'Service Flow',
          positionId: 'FOH',
          type: 'PDF',
          isRequired: true,
          description: 'Front counter service flow',
          originalName: 'service-flow.pdf',
          mimeType: 'application/pdf',
          objectKey: 'training/materials/12.pdf',
          sizeBytes: 2048n,
          bucket: 'training-private',
          createdAt: new Date('2026-05-01T09:00:00.000Z'),
          updatedAt: new Date('2026-05-04T12:00:00.000Z'),
          quiz: { id: 201 },
        },
      },
      {
        materialId: 14,
        completedAt: completedAtMiddle,
        material: {
          title: 'Menu Quiz',
          positionId: 'FOH',
          type: 'QUIZ',
          isRequired: true,
          description: 'Menu knowledge check',
          originalName: 'menu-quiz.json',
          mimeType: 'application/json',
          objectKey: 'training/materials/14.json',
          sizeBytes: 4096n,
          bucket: 'training-private',
          createdAt: new Date('2026-05-02T09:00:00.000Z'),
          updatedAt: new Date('2026-05-04T13:00:00.000Z'),
          quiz: { id: 202 },
        },
      },
      {
        materialId: 13,
        completedAt: completedAtEarlier,
        material: {
          title: 'Team Intro',
          positionId: 'FOH',
          type: 'VIDEO',
          isRequired: false,
          description: null,
          originalName: 'team-intro.mp4',
          mimeType: 'video/mp4',
          objectKey: 'training/materials/13.mp4',
          sizeBytes: 8192n,
          bucket: 'training-private',
          createdAt: new Date('2026-05-03T09:00:00.000Z'),
          updatedAt: new Date('2026-05-04T14:00:00.000Z'),
          quiz: null,
        },
      },
    ]);
    prismaService.trainingQuizAttempt.findMany.mockResolvedValue([
      {
        score: 72,
        passed: false,
        quiz: { materialId: 12 },
      },
      {
        score: 68,
        passed: false,
        quiz: { materialId: 12 },
      },
      {
        score: 88,
        passed: true,
        quiz: { materialId: 14 },
      },
      {
        score: 94,
        passed: true,
        quiz: { materialId: 14 },
      },
    ]);

    await expect(service.getMyRecords(42)).resolves.toEqual({
      records: [
        {
          materialId: 14,
          title: 'Menu Quiz',
          positionId: 'FOH',
          type: 'QUIZ',
          isRequired: true,
          description: 'Menu knowledge check',
          originalName: 'menu-quiz.json',
          mimeType: 'application/json',
          objectKey: 'training/materials/14.json',
          sizeBytes: '4096',
          bucket: 'training-private',
          createdAt: '2026-05-02T09:00:00.000Z',
          updatedAt: '2026-05-04T13:00:00.000Z',
          completedAt: '2026-05-05T15:00:00.000Z',
          hasQuiz: true,
          quizPassed: true,
          bestQuizScore: 94,
          quizAttemptsUsed: 2,
          quizScore: 94,
        },
        {
          materialId: 13,
          title: 'Team Intro',
          positionId: 'FOH',
          type: 'VIDEO',
          isRequired: false,
          description: null,
          originalName: 'team-intro.mp4',
          mimeType: 'video/mp4',
          objectKey: 'training/materials/13.mp4',
          sizeBytes: '8192',
          bucket: 'training-private',
          createdAt: '2026-05-03T09:00:00.000Z',
          updatedAt: '2026-05-04T14:00:00.000Z',
          completedAt: '2026-05-05T10:00:00.000Z',
          hasQuiz: false,
          quizPassed: false,
          bestQuizScore: null,
          quizAttemptsUsed: 0,
          quizScore: null,
        },
      ],
      titles: [],
      completedCount: 2,
    });

    expect(
      prismaService.trainingMaterialProgress.findMany,
    ).toHaveBeenCalledWith({
      where: { userId: 42, status: 'completed' },
      select: {
        materialId: true,
        completedAt: true,
        material: {
          select: {
            title: true,
            positionId: true,
            type: true,
            isRequired: true,
            description: true,
            originalName: true,
            mimeType: true,
            objectKey: true,
            sizeBytes: true,
            bucket: true,
            createdAt: true,
            updatedAt: true,
            quiz: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: [{ completedAt: 'desc' }],
    });
    expect(prismaService.trainingQuizAttempt.findMany).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: {
        score: true,
        passed: true,
        quiz: { select: { materialId: true } },
      },
    });
    expect(titleService.listEarnedTitles).toHaveBeenCalledWith(42);
  });
});

describe('TrainingQuizService.submitAttempt', () => {
  function createSubmitService() {
    const prismaService = {
      trainingQuiz: {
        findUnique: jest.fn(),
      },
      trainingQuizAttempt: {
        count: jest.fn(),
        create: jest.fn(),
      },
      trainingMaterialProgress: {
        upsert: jest.fn(),
      },
    };
    const titleService = {
      evaluateForPosition: jest.fn().mockResolvedValue([]),
      listEarnedTitles: jest.fn(),
    };
    const badgeService = {
      evaluateForMaterial: jest.fn().mockResolvedValue([
        {
          code: 'general_onboarding_certification',
          status: 'certified',
          earnedAt: '2026-07-03T00:00:00.000Z',
        },
      ]),
    };

    prismaService.trainingQuiz.findUnique.mockResolvedValue({
      id: 3,
      materialId: 11,
      passingScore: 80,
      maxAttempts: null,
      questionCount: 0,
      material: { positionId: 'ALL' },
      questions: [
        {
          id: 101,
          type: 'single',
          prompt: 'Q1',
          options: [{ key: 'a', label: 'A' }],
          correctKeys: ['a'],
          explanation: null,
          translations: null,
          sortOrder: 1,
        },
      ],
    });
    prismaService.trainingQuizAttempt.count.mockResolvedValue(0);
    prismaService.trainingQuizAttempt.create.mockResolvedValue({});
    prismaService.trainingMaterialProgress.upsert.mockResolvedValue({});

    return {
      prismaService,
      titleService,
      badgeService,
      service: new TrainingQuizService(
        prismaService as never,
        titleService as never,
        badgeService as never,
      ),
    };
  }

  it('rejects duplicate question answers before scoring', async () => {
    const { service } = createSubmitService();

    await expect(
      service.submitAttempt(7, 11, {
        answers: [
          { questionId: 101, selectedKeys: ['a'] },
          { questionId: 101, selectedKeys: ['a'] },
        ],
      }),
    ).rejects.toThrow('TRAINING_QUIZ_DUPLICATE_ANSWERS');
  });

  it('records a passed attempt and returns newly earned badges', async () => {
    const { service, prismaService, badgeService } = createSubmitService();

    await expect(
      service.submitAttempt(7, 11, {
        answers: [{ questionId: 101, selectedKeys: ['a'] }],
      }),
    ).resolves.toMatchObject({
      score: 100,
      passed: true,
      materialCompleted: true,
      newBadges: [{ code: 'general_onboarding_certification' }],
    });
    type CreateAttempt = (input: {
      data: {
        userId: number;
        quizId: number;
        score: number;
        passed: boolean;
      };
    }) => Promise<unknown>;
    const createAttemptMock = prismaService.trainingQuizAttempt
      .create as jest.MockedFunction<CreateAttempt>;
    const createCall = createAttemptMock.mock.calls[0]?.[0];

    expect(createCall.data).toMatchObject({
      userId: 7,
      quizId: 3,
      score: 100,
      passed: true,
    });
    expect(badgeService.evaluateForMaterial).toHaveBeenCalledWith(7, 11);
  });
});

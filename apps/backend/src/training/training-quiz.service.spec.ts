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

    return {
      prismaService,
      titleService,
      service: new TrainingQuizService(
        prismaService as never,
        titleService as never,
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

    expect(prismaService.trainingMaterialProgress.findMany).toHaveBeenCalledWith({
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

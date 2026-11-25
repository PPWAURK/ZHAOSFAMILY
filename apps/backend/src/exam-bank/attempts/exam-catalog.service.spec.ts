import { ExamCatalogService } from './exam-catalog.service';

describe('ExamCatalogService.listAvailable', () => {
  it('summarises the user progress per active exam', async () => {
    const prisma = {
      examTemplate: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            titleZh: 'A',
            titleFr: 'A',
            descriptionZh: null,
            descriptionFr: null,
            singleCount: 3,
            multipleCount: 1,
            booleanCount: 1,
            timeLimitMinutes: 10,
            passingScore: 80,
            maxAttempts: 3,
          },
        ]),
      },
      examAttempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 5,
            templateId: 1,
            status: 'SUBMITTED',
            score: 60,
            passed: false,
          },
          { id: 6, templateId: 1, status: 'EXPIRED', score: 85, passed: true },
          {
            id: 7,
            templateId: 1,
            status: 'IN_PROGRESS',
            score: null,
            passed: null,
          },
        ]),
      },
    };
    const [card] = await new ExamCatalogService(prisma as never).listAvailable(
      1,
    );
    expect(card).toEqual(
      expect.objectContaining({
        questionCount: 5,
        attemptsUsed: 2,
        bestScore: 85,
        hasPassed: true,
        inProgressAttemptId: 7,
      }),
    );
  });
});

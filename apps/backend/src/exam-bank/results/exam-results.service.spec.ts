import { ExamResultsService, buildResultsWhere } from './exam-results.service';

describe('buildResultsWhere', () => {
  it('only lists graded attempts and applies every filter', () => {
    expect(
      buildResultsWhere({
        templateId: 1,
        restaurantId: 2,
        passed: false,
        from: '2026-11-01',
        q: 'li',
      }),
    ).toEqual({
      status: { in: ['SUBMITTED', 'EXPIRED'] },
      templateId: 1,
      restaurantId: 2,
      userId: undefined,
      passed: false,
      submittedAt: { gte: new Date('2026-11-01'), lte: undefined },
      user: {
        OR: [{ name: { contains: 'li' } }, { email: { contains: 'li' } }],
      },
    });
  });
});

describe('ExamResultsService.questionStats', () => {
  it('computes the correct rate per question, hardest first', async () => {
    const q = (id: number) => ({
      id,
      type: 'single',
      promptZh: `题${id}`,
      promptFr: `Q${id}`,
    });
    const prisma = {
      examAttempt: {
        findMany: jest.fn().mockResolvedValue([
          {
            snapshot: [q(1), q(2)],
            results: [
              { questionId: 1, isCorrect: true },
              { questionId: 2, isCorrect: false },
            ],
          },
          {
            snapshot: [q(1), q(2)],
            results: [
              { questionId: 1, isCorrect: true },
              { questionId: 2, isCorrect: true },
            ],
          },
        ]),
      },
    };
    const stats = await new ExamResultsService(prisma as never).questionStats(
      4,
    );
    expect(
      stats.map((s) => [s.questionId, s.correctRate, s.answeredCount]),
    ).toEqual([
      [2, 50, 2],
      [1, 100, 2],
    ]);
  });
});

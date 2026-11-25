import { ConflictException } from '@nestjs/common';
import { ExamAttemptExpiryService } from './exam-attempt-expiry.service';
import { ExamAttemptGraderService } from './exam-attempt-grader.service';
import { toAttemptView } from './exam-attempt.view';
import { callArg, partial } from '../spec-helpers.testspec';

const opt = (key: string) => ({ key, zh: key, fr: key });
const snapshot = [
  {
    id: 1,
    type: 'single',
    promptZh: 'a',
    promptFr: 'a',
    options: ['A', 'B', 'C', 'D'].map(opt),
    correctKeys: ['A'],
    explanationZh: '解',
    explanationFr: 'Ex',
  },
  {
    id: 2,
    type: 'single',
    promptZh: 'b',
    promptFr: 'b',
    options: ['A', 'B', 'C', 'D'].map(opt),
    correctKeys: ['B'],
    explanationZh: null,
    explanationFr: null,
  },
];
const attempt = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 9,
    templateId: 4,
    status: 'IN_PROGRESS',
    snapshot,
    answers: [{ questionId: 1, selectedKeys: ['A'] }],
    results: null,
    score: null,
    passed: null,
    correctCount: null,
    totalCount: 2,
    startedAt: new Date(),
    deadlineAt: null,
    submittedAt: null,
    template: {
      titleZh: 't',
      titleFr: 't',
      passingScore: 50,
      showExplanations: false,
    },
    ...overrides,
  }) as never;

describe('ExamAttemptGraderService', () => {
  it('grades and closes the attempt only while it is in progress', async () => {
    const prisma = {
      examAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    await new ExamAttemptGraderService(prisma as never).finalize(
      attempt(),
      [{ questionId: 1, selectedKeys: ['A'] }],
      'SUBMITTED',
    );
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 9, status: 'IN_PROGRESS' },
      data: partial({
        status: 'SUBMITTED',
        activeKey: null,
        score: 50,
        passed: true,
        correctCount: 1,
      }),
    });
  });

  it('applies the veto rules frozen in the layout and clears the break', async () => {
    // Arrange: 1 of 2 right → score 50 ≥ 50, but the category allows 0 wrong.
    const prisma = {
      examAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const sectioned = attempt({
      snapshot: snapshot.map((q) => ({ ...q, section: 0, categoryId: 5 })),
      layout: {
        sections: [
          {
            titleZh: 's',
            titleFr: 's',
            timeLimitMinutes: 10,
            questionCount: 2,
          },
        ],
        breakMinutes: 0,
        rules: [{ categoryId: 5, labelZh: '文化', labelFr: 'C', maxWrong: 0 }],
        endsAt: null,
      },
    });

    // Act
    await new ExamAttemptGraderService(prisma as never).finalize(
      sectioned,
      [{ questionId: 1, selectedKeys: ['A'] }],
      'SUBMITTED',
    );

    // Assert
    const { data } = callArg<{ data: Record<string, unknown> }>(
      prisma.examAttempt.updateMany,
    );
    expect(data).toEqual(
      partial({ score: 50, passed: false, breakEndsAt: null }),
    );
    expect(data.ruleResults).toEqual([
      {
        categoryId: 5,
        labelZh: '文化',
        labelFr: 'C',
        maxWrong: 0,
        totalCount: 2,
        wrongCount: 1,
        passed: false,
      },
    ]);
  });

  it('expires with the autosaved answers and ignores a lost race', async () => {
    const prisma = {
      examAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    const now = new Date('2026-11-18T10:00:00Z');
    await expect(
      new ExamAttemptGraderService(prisma as never).expire(attempt(), now),
    ).resolves.toBeUndefined();
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 9, status: 'IN_PROGRESS' },
      data: partial({
        status: 'EXPIRED',
        answers: [{ questionId: 1, selectedKeys: ['A'] }],
        submittedAt: now,
      }),
    });
  });

  it('throws when the attempt was already graded', async () => {
    const prisma = {
      examAttempt: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    await expect(
      new ExamAttemptGraderService(prisma as never).finalize(
        attempt(),
        [],
        'SUBMITTED',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ExamAttemptExpiryService', () => {
  const now = new Date('2026-11-18T10:00:00Z');

  it('settles overdue attempts, which applies their saved answers', async () => {
    // Arrange
    const overdue = attempt();
    const prisma = {
      examAttempt: { findMany: jest.fn().mockResolvedValue([overdue]) },
    };
    const progress = { settle: jest.fn().mockResolvedValue(overdue) };

    // Act
    const found = await new ExamAttemptExpiryService(
      prisma as never,
      progress as never,
    ).expireOverdue(now);

    // Assert
    expect(found).toBe(true);
    expect(
      callArg<{ where: unknown }>(prisma.examAttempt.findMany).where,
    ).toEqual({
      status: 'IN_PROGRESS',
      deadlineAt: { lt: new Date(now.getTime() - 60_000) },
    });
    expect(progress.settle).toHaveBeenCalledWith(overdue, now);
  });

  it('keeps settling the other attempts when one fails', async () => {
    const prisma = {
      examAttempt: {
        findMany: jest
          .fn()
          .mockResolvedValue([attempt({ id: 1 }), attempt({ id: 2 })]),
      },
    };
    const progress = {
      settle: jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(undefined),
    };
    await new ExamAttemptExpiryService(
      prisma as never,
      progress as never,
    ).expireOverdue(now);
    expect(progress.settle).toHaveBeenCalledTimes(2);
  });

  it('reports when nothing was overdue', async () => {
    const prisma = {
      examAttempt: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const progress = { settle: jest.fn() };
    await expect(
      new ExamAttemptExpiryService(
        prisma as never,
        progress as never,
      ).expireOverdue(now),
    ).resolves.toBe(false);
    expect(progress.settle).not.toHaveBeenCalled();
  });
});

describe('toAttemptView', () => {
  const graded = attempt({
    status: 'SUBMITTED',
    score: 50,
    passed: true,
    correctCount: 1,
    results: [
      { questionId: 1, isCorrect: true },
      { questionId: 2, isCorrect: false },
    ],
  });

  it('hides keys and explanations from employees when the template disables them', () => {
    const view = toAttemptView(graded);
    expect(view.questions).toBeNull();
    expect(view.result?.items[0]).toEqual(
      expect.objectContaining({
        isCorrect: true,
        correctKeys: [],
        explanationZh: null,
      }),
    );
  });

  it('always shows details to admins', () => {
    expect(toAttemptView(graded, true).result?.items[0]).toEqual(
      expect.objectContaining({ correctKeys: ['A'], explanationZh: '解' }),
    );
  });
});

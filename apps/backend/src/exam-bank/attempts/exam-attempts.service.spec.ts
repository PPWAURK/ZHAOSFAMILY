import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ExamAttemptsService,
  activeKeyFor,
  isOverdue,
} from './exam-attempts.service';
import { ExamAttemptProgressService } from './exam-attempt-progress.service';
import { ExamAttemptStarterService } from './exam-attempt-starter.service';
import { callArg, partial } from '../spec-helpers.testspec';

const NOW = new Date();
const opt = (key: string) => ({ key, zh: key, fr: key });
const template = (overrides: Record<string, unknown> = {}) => ({
  id: 4,
  titleZh: '卫生考试',
  titleFr: 'Examen hygiène',
  singleCount: 2,
  multipleCount: 0,
  booleanCount: 1,
  categoryIds: null,
  materialIds: null,
  difficulties: null,
  blueprint: null,
  timeLimitMinutes: 10,
  passingScore: 60,
  maxAttempts: 2,
  shuffleOptions: false,
  showExplanations: true,
  isActive: true,
  ...overrides,
});
const question = (id: number, type: string) => ({
  id,
  type,
  promptZh: `题${id}`,
  promptFr: `Q${id}`,
  options:
    type === 'boolean'
      ? [opt('false'), opt('true')]
      : ['A', 'B', 'C', 'D'].map(opt),
  correctKeys: type === 'boolean' ? ['true'] : ['A'],
  explanationZh: '解析',
  explanationFr: 'Explication',
});
const attempt = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  templateId: 4,
  userId: 1,
  status: 'IN_PROGRESS',
  snapshot: [question(1, 'single'), question(3, 'boolean')],
  answers: [],
  results: null,
  score: null,
  passed: null,
  correctCount: null,
  totalCount: 2,
  startedAt: NOW,
  deadlineAt: new Date(NOW.getTime() + 600_000),
  submittedAt: null,
  layout: null,
  sectionIndex: 0,
  breakEndsAt: null,
  ruleResults: null,
  template: template(),
  ...overrides,
});

function buildService() {
  const prisma = {
    examTemplate: { findFirst: jest.fn().mockResolvedValue(template()) },
    examAttempt: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(attempt()),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(attempt(args.data)),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue(attempt({ status: 'EXPIRED' })),
    },
    examQuestion: {
      findMany: jest.fn((args: { where: { type?: string; id?: unknown } }) => {
        if (args.where.type === 'single')
          return Promise.resolve([{ id: 1 }, { id: 2 }, { id: 5 }]);
        if (args.where.type === 'boolean') return Promise.resolve([{ id: 3 }]);
        return Promise.resolve([
          question(1, 'single'),
          question(2, 'single'),
          question(5, 'single'),
          question(3, 'boolean'),
        ]);
      }),
    },
  };
  const grader = {
    finalize: jest.fn().mockResolvedValue(undefined),
    expire: jest.fn().mockResolvedValue(undefined),
  };
  const blueprints = {
    loadCandidates: jest.fn().mockResolvedValue([]),
    ruleLabels: jest.fn().mockResolvedValue([]),
  };
  const progress = new ExamAttemptProgressService(
    prisma as never,
    grader as never,
  );
  const starter = new ExamAttemptStarterService(
    prisma as never,
    progress,
    blueprints as never,
  );
  const service = new ExamAttemptsService(
    prisma as never,
    grader as never,
    starter,
    progress,
  );
  return { service, prisma, grader, progress };
}

const USER = { id: 1, restaurantId: 7 } as never;

describe('ExamAttemptsService', () => {
  it('detects overdue attempts after the grace period', () => {
    expect(isOverdue({ deadlineAt: null })).toBe(false);
    expect(isOverdue({ deadlineAt: new Date(Date.now() - 30_000) })).toBe(
      false,
    );
    expect(isOverdue({ deadlineAt: new Date(Date.now() - 61_000) })).toBe(true);
  });

  it('draws a fresh paper, persists the drawn ids and hides answer keys', async () => {
    const { service, prisma } = buildService();
    const view = await service.start(USER, 4);

    const { data } = callArg<{
      data: {
        activeKey: string;
        restaurantId: number;
        questionIds: number[];
        snapshot: Array<{ options: Array<{ key: string }> }>;
        deadlineAt: Date;
        startedAt: Date;
      };
    }>(prisma.examAttempt.create);
    expect(data.activeKey).toBe(activeKeyFor(1, 4));
    expect(data.restaurantId).toBe(7);
    expect(data.questionIds).toHaveLength(3);
    expect(data.questionIds.at(-1)).toBe(3);
    expect(data.snapshot.at(-1)?.options.map((o) => o.key)).toEqual([
      'true',
      'false',
    ]);
    expect(data.deadlineAt.getTime() - data.startedAt.getTime()).toBe(600_000);
    expect(JSON.stringify(view.questions)).not.toContain('correctKeys');
    expect(JSON.stringify(view.questions)).not.toContain('解析');
  });

  it('resumes the running attempt instead of drawing a new one', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.findUnique.mockResolvedValue(attempt());
    const view = await service.start(USER, 4);
    expect(view.id).toBe(9);
    expect(prisma.examAttempt.create).not.toHaveBeenCalled();
  });

  it('draws a new paper when the running one turns out to be overdue', async () => {
    const { service, prisma, grader } = buildService();
    const overdue = attempt({ deadlineAt: new Date(Date.now() - 120_000) });
    prisma.examAttempt.findUnique.mockResolvedValue(overdue);
    await service.start(USER, 4);
    expect(grader.expire).toHaveBeenCalledWith(overdue, expect.any(Date));
    expect(prisma.examAttempt.create).toHaveBeenCalledTimes(1);
  });

  it('enforces max attempts, active templates and pool size', async () => {
    const limited = buildService();
    limited.prisma.examAttempt.count.mockResolvedValue(2);
    await expect(limited.service.start(USER, 4)).rejects.toEqual(
      new ConflictException('EXAM_NO_ATTEMPTS_LEFT'),
    );

    const inactive = buildService();
    inactive.prisma.examTemplate.findFirst.mockResolvedValue(null);
    await expect(inactive.service.start(USER, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const small = buildService();
    small.prisma.examTemplate.findFirst.mockResolvedValue(
      template({ booleanCount: 5 }),
    );
    await expect(small.service.start(USER, 4)).rejects.toEqual(
      new ConflictException('EXAM_POOL_INSUFFICIENT'),
    );
  });

  it('returns the winner when a concurrent start hits the unique active key', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    prisma.examAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(attempt({ id: 42 }));
    await expect(service.start(USER, 4)).resolves.toEqual(
      expect.objectContaining({ id: 42 }),
    );
  });

  it('submits valid answers and rejects invalid ones', async () => {
    const { service, grader } = buildService();
    await service.submit(USER, 9, {
      answers: [{ questionId: 1, selectedKeys: ['A'] }],
    });
    expect(grader.finalize).toHaveBeenCalledWith(
      partial({ id: 9 }),
      [{ questionId: 1, selectedKeys: ['A'] }],
      'SUBMITTED',
    );
    await expect(
      service.submit(USER, 9, {
        answers: [{ questionId: 99, selectedKeys: ['A'] }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('grades a late submit with the autosaved answers as EXPIRED', async () => {
    const { service, prisma, grader } = buildService();
    const late = attempt({
      deadlineAt: new Date(Date.now() - 120_000),
      answers: [{ questionId: 1, selectedKeys: ['B'] }],
    });
    prisma.examAttempt.findFirst.mockResolvedValue(late);
    await service.submit(USER, 9, {
      answers: [{ questionId: 1, selectedKeys: ['A'] }],
    });
    expect(grader.expire).toHaveBeenCalledWith(late, expect.any(Date));
    expect(grader.finalize).not.toHaveBeenCalled();
  });

  it('refuses to autosave after the deadline or on a graded attempt', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.findFirst.mockResolvedValueOnce(
      attempt({ deadlineAt: new Date(Date.now() - 120_000) }),
    );
    await expect(service.saveAnswers(USER, 9, { answers: [] })).rejects.toEqual(
      new ConflictException('EXAM_ATTEMPT_EXPIRED'),
    );
    prisma.examAttempt.findFirst.mockResolvedValueOnce(
      attempt({ status: 'SUBMITTED' }),
    );
    await expect(service.saveAnswers(USER, 9, { answers: [] })).rejects.toEqual(
      new ConflictException('EXAM_ATTEMPT_ALREADY_SUBMITTED'),
    );
  });

  it('hides other users attempts', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.findFirst.mockResolvedValue(null);
    await expect(service.get(USER, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.examAttempt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 9, userId: 1 } }),
    );
  });
});
describe('ExamAttemptsService with a sectioned paper', () => {
  const inSection = (id: number, type: string, section: number) => ({
    ...question(id, type),
    section,
    categoryId: null,
  });
  const layout = {
    sections: [
      {
        titleZh: '上场',
        titleFr: 'P1',
        timeLimitMinutes: 30,
        questionCount: 2,
      },
      {
        titleZh: '下场',
        titleFr: 'P2',
        timeLimitMinutes: 30,
        questionCount: 2,
      },
    ],
    breakMinutes: 15,
    rules: [],
    endsAt: null,
  };
  const minutesFromNow = (minutes: number) =>
    new Date(Date.now() + minutes * 60_000);
  const sectioned = (overrides: Record<string, unknown> = {}) =>
    attempt({
      snapshot: [
        inSection(1, 'single', 0),
        inSection(3, 'boolean', 0),
        inSection(5, 'single', 1),
        inSection(6, 'single', 1),
      ],
      totalCount: 4,
      layout,
      deadlineAt: minutesFromNow(20),
      ...overrides,
    });
  const onBreakBeforeSecond = (overrides: Record<string, unknown> = {}) =>
    sectioned({
      sectionIndex: 1,
      breakEndsAt: minutesFromNow(10),
      deadlineAt: minutesFromNow(40),
      answers: [{ questionId: 1, selectedKeys: ['A'] }],
      ...overrides,
    });

  it('hands in a non-last section with the merged answers and starts the break', async () => {
    // Arrange
    const { service, prisma, grader, progress } = buildService();
    const completeSection = jest.spyOn(progress, 'completeSection');
    prisma.examAttempt.findFirst.mockResolvedValue(
      sectioned({ answers: [{ questionId: 1, selectedKeys: ['B'] }] }),
    );

    // Act
    await service.submit(USER, 9, {
      sectionIndex: 0,
      answers: [
        { questionId: 1, selectedKeys: ['A'] },
        { questionId: 3, selectedKeys: ['true'] },
        { questionId: 5, selectedKeys: ['A'] },
      ],
    });

    // Assert
    expect(completeSection).toHaveBeenCalledWith(partial({ id: 9 }), [
      { questionId: 1, selectedKeys: ['A'] },
      { questionId: 3, selectedKeys: ['true'] },
    ]);
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 9, status: 'IN_PROGRESS', sectionIndex: 0 },
      data: partial({ sectionIndex: 1 }),
    });
    expect(grader.finalize).not.toHaveBeenCalled();
  });

  it('grades the paper when the last section is handed in, keeping earlier answers', async () => {
    const { service, prisma, grader, progress } = buildService();
    const completeSection = jest.spyOn(progress, 'completeSection');
    prisma.examAttempt.findFirst.mockResolvedValue(
      onBreakBeforeSecond({ breakEndsAt: minutesFromNow(-1) }),
    );

    await service.submit(USER, 9, {
      sectionIndex: 1,
      answers: [
        { questionId: 1, selectedKeys: ['C'] },
        { questionId: 5, selectedKeys: ['A'] },
      ],
    });

    expect(grader.finalize).toHaveBeenCalledWith(
      partial({ id: 9 }),
      [
        { questionId: 1, selectedKeys: ['A'] },
        { questionId: 5, selectedKeys: ['A'] },
      ],
      'SUBMITTED',
    );
    expect(completeSection).not.toHaveBeenCalled();
  });

  it('returns the current state without writing for a stale section index', async () => {
    // Arrange
    const { service, prisma, grader } = buildService();
    prisma.examAttempt.findFirst.mockResolvedValue(onBreakBeforeSecond());

    // Act
    const view = await service.submit(USER, 9, {
      sectionIndex: 0,
      answers: [{ questionId: 1, selectedKeys: ['B'] }],
    });

    // Assert
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
    expect(grader.finalize).not.toHaveBeenCalled();
    expect(view.sectionIndex).toBe(1);
    expect(view.breakEndsAt).not.toBeNull();
    expect(view.questions).toEqual([]);
  });

  it('refuses a submit of the current section during the break', async () => {
    const { service, prisma, grader } = buildService();
    prisma.examAttempt.findFirst.mockResolvedValue(onBreakBeforeSecond());

    await expect(
      service.submit(USER, 9, { sectionIndex: 1, answers: [] }),
    ).rejects.toEqual(new ConflictException('EXAM_SECTION_ON_BREAK'));
    expect(prisma.examAttempt.updateMany).not.toHaveBeenCalled();
    expect(grader.finalize).not.toHaveBeenCalled();
  });

  it('autosaves only the current section, conditional on the section index', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.findFirst.mockResolvedValue(
      onBreakBeforeSecond({ breakEndsAt: null }),
    );

    await service.saveAnswers(USER, 9, {
      answers: [
        { questionId: 1, selectedKeys: ['D'] },
        { questionId: 6, selectedKeys: ['B'] },
      ],
    });

    expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith({
      where: { id: 9, status: 'IN_PROGRESS', sectionIndex: 1 },
      data: {
        answers: [
          { questionId: 1, selectedKeys: ['A'] },
          { questionId: 6, selectedKeys: ['B'] },
        ],
      },
    });
  });

  it('starts the section early through the progress service', async () => {
    const { service, prisma, progress } = buildService();
    const startSection = jest.spyOn(progress, 'startSection');
    prisma.examAttempt.findFirst.mockResolvedValue(onBreakBeforeSecond());

    await service.startSection(USER, 9, 1);

    expect(startSection).toHaveBeenCalledWith(partial({ id: 9 }), 1);
    expect(prisma.examAttempt.updateMany).toHaveBeenCalledWith({
      where: partial({ id: 9, sectionIndex: 1, status: 'IN_PROGRESS' }),
      data: partial({ sectionIndex: 1, breakEndsAt: null }),
    });
  });
});

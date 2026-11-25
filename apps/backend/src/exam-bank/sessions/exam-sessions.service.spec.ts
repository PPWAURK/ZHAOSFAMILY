import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExamSessionCloserService } from './exam-session-closer.service';
import { ExamSessionsService } from './exam-sessions.service';
import { callArg } from '../spec-helpers.testspec';

const NOW = new Date();
const EXAMINER = { id: 7, permissions: ['exam.session.manage'] } as never;
const OTHER_EXAMINER = { id: 8, permissions: ['exam.session.manage'] } as never;
const ADMIN = { id: 1, permissions: ['exam.bank.manage'] } as never;

const template = {
  id: 4,
  titleZh: '考试',
  titleFr: 'Examen',
  singleCount: 5,
  multipleCount: 2,
  booleanCount: 3,
  timeLimitMinutes: 30,
  passingScore: 80,
  categoryIds: null,
  materialIds: null,
  difficulties: null,
  blueprint: null,
};

const sessionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  code: '048213',
  activeCode: '048213',
  label: null,
  status: 'SCHEDULED',
  examinerUserId: 7,
  startsAt: null,
  endsAt: null,
  openedAt: null,
  closedAt: null,
  createdAt: NOW,
  template,
  examiner: { id: 7, name: 'Chef' },
  ...overrides,
});

function buildService(sufficient = true) {
  const prisma = {
    examTemplate: { findUnique: jest.fn().mockResolvedValue(template) },
    examSession: {
      create: jest.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(sessionRow(args.data)),
      ),
      findUnique: jest.fn().mockResolvedValue(sessionRow()),
      findMany: jest.fn().mockResolvedValue([sessionRow()]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    examAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([
        { sessionId: 3, status: 'IN_PROGRESS', _count: { _all: 2 } },
        { sessionId: 3, status: 'SUBMITTED', _count: { _all: 5 } },
      ]),
    },
  };
  const templates = {
    isFillable: jest.fn().mockResolvedValue(sufficient),
  };
  const closer = { close: jest.fn().mockResolvedValue(undefined) };
  const service = new ExamSessionsService(
    prisma as never,
    templates as never,
    closer as never,
  );
  return { service, prisma, templates, closer };
}

describe('ExamSessionsService', () => {
  it('creates a scheduled session with a live code owned by the examiner', async () => {
    const { service, prisma } = buildService();
    const view = await service.create(EXAMINER, {
      templateId: 4,
      label: ' 早班 ',
    });
    const data = (
      prisma.examSession.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ]
    )[0].data;
    expect(data).toEqual(
      expect.objectContaining({
        templateId: 4,
        examinerUserId: 7,
        label: '早班',
      }) as unknown,
    );
    expect(data.code).toBe(data.activeCode);
    expect(view.status).toBe('SCHEDULED');
    expect(view.template.questionCount).toBe(10);
  });

  it('retries on a code collision', async () => {
    const { service, prisma } = buildService();
    prisma.examSession.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );
    await service.create(EXAMINER, { templateId: 4 });
    expect(prisma.examSession.create).toHaveBeenCalledTimes(2);
  });

  it('refuses insufficient pools and invalid windows', async () => {
    const unfillable = buildService(false);
    await expect(
      unfillable.service.create(EXAMINER, { templateId: 4 }),
    ).rejects.toEqual(new ConflictException('EXAM_POOL_INSUFFICIENT'));
    expect(unfillable.templates.isFillable).toHaveBeenCalledWith(template);
    const { service } = buildService();
    await expect(
      service.create(EXAMINER, {
        templateId: 4,
        endsAt: new Date(Date.now() - 1000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(EXAMINER, {
        templateId: 4,
        startsAt: new Date(Date.now() + 7200_000).toISOString(),
        endsAt: new Date(Date.now() + 3600_000).toISOString(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only the examiner own sessions, but every session for admins, with counts', async () => {
    const { service, prisma } = buildService();
    const [view] = await service.list(EXAMINER);
    expect(callArg<unknown>(prisma.examSession.findMany)).toEqual(
      expect.objectContaining({ where: { examinerUserId: 7 } }) as unknown,
    );
    expect(view.participantCount).toBe(7);
    expect(view.submittedCount).toBe(5);

    await service.list(ADMIN);
    expect(callArg<unknown>(prisma.examSession.findMany, 1)).toEqual(
      expect.objectContaining({ where: {} }) as unknown,
    );
  });

  it("forbids another examiner's session but lets admins in", async () => {
    await expect(
      buildService().service.detail(OTHER_EXAMINER, 3),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(buildService().service.detail(ADMIN, 3)).resolves.toEqual(
      expect.objectContaining({ id: 3, participants: [] }) as unknown,
    );
  });

  it('reports the section progress and break state of sectioned participants', async () => {
    // Arrange
    const { service, prisma } = buildService();
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
    const attempt = {
      id: 21,
      user: { id: 5, name: 'A' },
      restaurant: null,
      status: 'IN_PROGRESS',
      answers: [{ questionId: 1, selectedKeys: ['A'] }],
      totalCount: 4,
      score: null,
      passed: null,
      startedAt: NOW,
      deadlineAt: new Date(Date.now() + 45 * 60_000),
      submittedAt: null,
      sectionIndex: 1,
      layout,
      breakEndsAt: new Date(Date.now() + 10 * 60_000),
    };
    prisma.examAttempt.findMany.mockResolvedValue([
      attempt,
      { ...attempt, id: 22, layout: null, sectionIndex: 0, breakEndsAt: null },
    ]);

    // Act
    const detail = await service.detail(EXAMINER, 3);

    // Assert
    expect(
      detail.participants.map((p) => [
        p.sectionIndex,
        p.sectionCount,
        p.isOnBreak,
      ]),
    ).toEqual([
      [1, 2, true],
      [0, 1, false],
    ]);
  });

  it('opens a scheduled session and closes it through the closer', async () => {
    const { service, prisma, closer } = buildService();
    await service.open(EXAMINER, 3);
    expect(prisma.examSession.updateMany).toHaveBeenCalledWith({
      where: { id: 3, status: 'SCHEDULED' },
      data: expect.objectContaining({ status: 'OPEN' }) as unknown,
    });
    prisma.examSession.findUnique.mockResolvedValue(
      sessionRow({ status: 'OPEN' }),
    );
    await service.close(EXAMINER, 3);
    expect(closer.close).toHaveBeenCalledWith(3);
  });

  it('cannot reopen a closed session', async () => {
    const { service, prisma } = buildService();
    prisma.examSession.findUnique.mockResolvedValue(
      sessionRow({ status: 'CLOSED' }),
    );
    await expect(service.open(EXAMINER, 3)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.close(EXAMINER, 3)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('ExamSessionCloserService', () => {
  function buildCloser() {
    const running = [{ id: 11 }, { id: 12 }];
    const prisma = {
      examSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ id: 3 }]),
      },
      examAttempt: { findMany: jest.fn().mockResolvedValue(running) },
    };
    const grader = { expire: jest.fn().mockResolvedValue(undefined) };
    return {
      closer: new ExamSessionCloserService(prisma as never, grader as never),
      prisma,
      grader,
    };
  }

  it('closes the session, frees the code and force-collects running attempts', async () => {
    const { closer, prisma, grader } = buildCloser();
    await closer.close(3, NOW);
    expect(prisma.examSession.updateMany).toHaveBeenCalledWith({
      where: { id: 3, status: { not: 'CLOSED' } },
      data: { status: 'CLOSED', activeCode: null, closedAt: NOW },
    });
    expect(grader.expire).toHaveBeenCalledTimes(2);
  });

  it('closes sessions past their end from the worker', async () => {
    const { closer, prisma } = buildCloser();
    await expect(closer.closeExpired(NOW)).resolves.toBe(true);
    expect(callArg<unknown>(prisma.examSession.findMany)).toEqual(
      expect.objectContaining({
        where: { status: { in: ['SCHEDULED', 'OPEN'] }, endsAt: { lt: NOW } },
      }) as unknown,
    );
  });
});

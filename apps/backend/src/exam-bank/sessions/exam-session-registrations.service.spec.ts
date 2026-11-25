import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { callArg } from '../spec-helpers.testspec';
import { ExamSessionRegistrationsService } from './exam-session-registrations.service';

const EXAMINER = { id: 7, permissions: ['exam.session.manage'] } as never;
const OTHER = { id: 8, permissions: ['exam.session.manage'] } as never;
const ADMIN = { id: 1, permissions: ['exam.bank.manage'] } as never;
const NOW = new Date('2026-11-26T10:00:00Z');

const session = (overrides: Record<string, unknown> = {}) => ({
  id: 3,
  status: 'SCHEDULED',
  examinerUserId: 7,
  template: { titleZh: '考试', titleFr: 'Examen' },
  ...overrides,
});

function buildService() {
  const prisma = {
    examSession: { findUnique: jest.fn().mockResolvedValue(session()) },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 11 }, { id: 12 }]),
    },
    examSessionRegistration: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    examAttempt: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
  const notifications = { sendToUsers: jest.fn().mockResolvedValue(undefined) };
  const service = new ExamSessionRegistrationsService(
    prisma as never,
    notifications as never,
  );
  return { service, prisma, notifications };
}

describe('ExamSessionRegistrationsService', () => {
  it('registers new users, notifies them and stamps notifiedAt', async () => {
    const { service, prisma, notifications } = buildService();
    prisma.user.findMany
      .mockResolvedValueOnce([{ id: 11 }, { id: 12 }])
      .mockResolvedValueOnce([
        { id: 11, preferredLanguage: 'zh' },
        { id: 12, preferredLanguage: 'fr' },
      ]);

    await expect(service.add(EXAMINER, 3, [11, 12, 11])).resolves.toEqual({
      added: 2,
    });

    const { data } = callArg<{ data: Array<{ userId: number }> }>(
      prisma.examSessionRegistration.createMany,
    );
    expect(data.map((d) => d.userId)).toEqual([11, 12]);
    expect(notifications.sendToUsers).toHaveBeenCalledTimes(2);
    expect(prisma.examSessionRegistration.updateMany).toHaveBeenCalledTimes(1);
  });

  it('skips users already on the roster without notifying again', async () => {
    const { service, prisma, notifications } = buildService();
    prisma.examSessionRegistration.findMany.mockResolvedValue([
      { userId: 11 },
      { userId: 12 },
    ]);
    await expect(service.add(EXAMINER, 3, [11, 12])).resolves.toEqual({
      added: 0,
    });
    expect(prisma.examSessionRegistration.createMany).not.toHaveBeenCalled();
    expect(notifications.sendToUsers).not.toHaveBeenCalled();
  });

  it('rejects unknown or unapproved users and closed sessions', async () => {
    const { service, prisma } = buildService();
    prisma.user.findMany.mockResolvedValue([{ id: 11 }]);
    await expect(service.add(EXAMINER, 3, [11, 99])).rejects.toEqual(
      new NotFoundException('EXAM_REGISTRATION_USER_NOT_FOUND'),
    );
    prisma.examSession.findUnique.mockResolvedValue(
      session({ status: 'CLOSED' }),
    );
    await expect(service.add(EXAMINER, 3, [11])).rejects.toEqual(
      new ConflictException('EXAM_SESSION_ALREADY_CLOSED'),
    );
  });

  it('keeps the registration when the push fails', async () => {
    const { service, prisma, notifications } = buildService();
    notifications.sendToUsers.mockRejectedValue(new Error('expo down'));
    prisma.user.findMany
      .mockResolvedValueOnce([{ id: 11 }])
      .mockResolvedValueOnce([{ id: 11, preferredLanguage: 'zh' }]);
    await expect(service.add(EXAMINER, 3, [11])).resolves.toEqual({
      added: 1,
    });
  });

  it('limits examiners to their own sessions but lets admins through', async () => {
    const { service } = buildService();
    await expect(service.list(OTHER, 3)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.list(ADMIN, 3)).resolves.toEqual([]);
  });

  it('derives roster status from attempts and the session state', async () => {
    const { service, prisma } = buildService();
    const user = (id: number) => ({
      id,
      name: `U${id}`,
      jobRole: null,
      restaurant: { id: 1, name: 'R' },
    });
    prisma.examSessionRegistration.findMany.mockResolvedValue([
      { userId: 1, user: user(1), createdAt: NOW },
      { userId: 2, user: user(2), createdAt: NOW },
      { userId: 3, user: user(3), createdAt: NOW },
    ]);
    prisma.examAttempt.findMany.mockResolvedValue([
      { userId: 1, status: 'IN_PROGRESS' },
      { userId: 2, status: 'SUBMITTED' },
    ]);
    const open = await service.list(EXAMINER, 3);
    expect(open.map((r) => r.status)).toEqual([
      'IN_PROGRESS',
      'SUBMITTED',
      'NOT_STARTED',
    ]);

    prisma.examSession.findUnique.mockResolvedValue(
      session({ status: 'CLOSED' }),
    );
    const closed = await service.list(EXAMINER, 3);
    expect(closed[2].status).toBe('ABSENT');
  });

  it('refuses to remove someone who already started', async () => {
    const { service, prisma } = buildService();
    prisma.examAttempt.findUnique.mockResolvedValue({ id: 5 });
    await expect(service.remove(EXAMINER, 3, 11)).rejects.toEqual(
      new ConflictException('EXAM_REGISTRATION_HAS_ATTEMPT'),
    );
    prisma.examAttempt.findUnique.mockResolvedValue(null);
    await expect(service.remove(EXAMINER, 3, 11)).resolves.toBeUndefined();
    prisma.examSessionRegistration.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(EXAMINER, 3, 11)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

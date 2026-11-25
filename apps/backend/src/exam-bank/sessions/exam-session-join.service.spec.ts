import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExamSessionJoinService } from './exam-session-join.service';

const NOW = new Date('2026-11-23T10:00:00Z');
const USER = { id: 5, restaurantId: 2 } as never;

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    status: 'OPEN',
    startsAt: null,
    endsAt: new Date('2026-11-23T11:00:00Z'),
    template: { id: 4, timeLimitMinutes: 30 },
    ...overrides,
  };
}

function buildService(found: unknown = session()) {
  const prisma = {
    examSession: { findUnique: jest.fn().mockResolvedValue(found) },
    examAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const starter = { open: jest.fn().mockResolvedValue({ id: 99 }) };
  const service = new ExamSessionJoinService(prisma as never, starter as never);
  return { service, prisma, starter };
}

describe('ExamSessionJoinService', () => {
  it('starts a session attempt capped by the session end, without the template attempt limit', async () => {
    const { service, starter, prisma } = buildService();
    await expect(service.join(USER, '123456', NOW)).resolves.toEqual({
      id: 99,
    });
    expect(prisma.examSession.findUnique).toHaveBeenCalledWith({
      where: { activeCode: '123456' },
      include: { template: true },
    });
    expect(starter.open).toHaveBeenCalledWith(
      USER,
      { id: 4, timeLimitMinutes: 30 },
      {
        activeKey: 's3-u5',
        sessionId: 3,
        endsAt: new Date('2026-11-23T11:00:00Z'),
        enforceMaxAttempts: false,
      },
    );
  });

  it('rejects unknown codes and throttles repeated guesses', async () => {
    const { service } = buildService(null);
    for (let i = 0; i < 10; i += 1) {
      await expect(service.join(USER, '000000', NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
    await expect(service.join(USER, '000000', NOW)).rejects.toThrow(
      'EXAM_SESSION_TOO_MANY_TRIES',
    );
  });

  it('only admits employees while the examiner has opened the session and within its window', async () => {
    await expect(
      buildService(session({ status: 'SCHEDULED' })).service.join(
        USER,
        '123456',
        NOW,
      ),
    ).rejects.toThrow('EXAM_SESSION_NOT_OPEN');
    await expect(
      buildService(
        session({ startsAt: new Date('2026-11-23T10:30:00Z') }),
      ).service.join(USER, '123456', NOW),
    ).rejects.toThrow('EXAM_SESSION_NOT_OPEN');
    await expect(
      buildService(
        session({ endsAt: new Date('2026-11-23T09:59:00Z') }),
      ).service.join(USER, '123456', NOW),
    ).rejects.toThrow('EXAM_SESSION_ENDED');
  });

  it('allows one paper per employee: resume while running, refuse once graded', async () => {
    const running = buildService();
    running.prisma.examAttempt.findUnique.mockResolvedValue({
      status: 'IN_PROGRESS',
    });
    await running.service.join(USER, '123456', NOW);
    expect(running.starter.open).toHaveBeenCalled();

    const graded = buildService();
    graded.prisma.examAttempt.findUnique.mockResolvedValue({
      status: 'SUBMITTED',
    });
    await expect(graded.service.join(USER, '123456', NOW)).rejects.toEqual(
      new ConflictException('EXAM_SESSION_ALREADY_TAKEN'),
    );
    expect(graded.starter.open).not.toHaveBeenCalled();
  });
});

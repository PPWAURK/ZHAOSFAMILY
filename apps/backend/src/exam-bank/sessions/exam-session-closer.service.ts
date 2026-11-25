import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamAttemptGraderService } from '../attempts/exam-attempt-grader.service';
import { claimRow, releaseRow } from '../worker/row-lock';

const SESSIONS_PER_TICK = 20;
const STRAGGLERS_PER_TICK = 100;

/**
 * Closes sessions and force-collects their running attempts with the last
 * autosaved answers. Used by the examiner's "end" button and by the worker
 * when a session's endsAt has passed.
 */
@Injectable()
export class ExamSessionCloserService {
  private readonly logger = new Logger(ExamSessionCloserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly grader: ExamAttemptGraderService,
  ) {}

  async close(sessionId: number, now: Date = new Date()): Promise<void> {
    await this.prisma.examSession.updateMany({
      where: { id: sessionId, status: { not: 'CLOSED' } },
      data: { status: 'CLOSED', activeCode: null, closedAt: now },
    });
    await this.collect(sessionId, now);
  }

  /** Worker task: close sessions past their end and collect any leftovers. */
  async closeExpired(now: Date = new Date()): Promise<boolean> {
    const expired = await this.prisma.examSession.findMany({
      where: { status: { in: ['SCHEDULED', 'OPEN'] }, endsAt: { lt: now } },
      select: { id: true },
      take: SESSIONS_PER_TICK,
    });
    for (const { id } of expired) {
      if (!(await claimRow(this.prisma.examSession, id, now))) continue;
      try {
        await this.close(id, now);
      } finally {
        await releaseRow(this.prisma.examSession, id);
      }
    }
    // Attempts still running in a CLOSED session (e.g. a crash mid-close).
    const stragglers = await this.prisma.examAttempt.findMany({
      where: { status: 'IN_PROGRESS', session: { status: 'CLOSED' } },
      include: { template: true },
      take: STRAGGLERS_PER_TICK,
    });
    for (const attempt of stragglers) {
      await this.grader.expire(attempt, now);
    }
    return expired.length > 0 || stragglers.length > 0;
  }

  private async collect(sessionId: number, now: Date): Promise<void> {
    const running = await this.prisma.examAttempt.findMany({
      where: { sessionId, status: 'IN_PROGRESS' },
      include: { template: true },
    });
    for (const attempt of running) {
      await this.grader.expire(attempt, now);
    }
    if (running.length) {
      this.logger.log(
        `Session #${sessionId}: collected ${running.length} running attempt(s).`,
      );
    }
  }
}

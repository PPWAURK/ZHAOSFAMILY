import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBMIT_GRACE_MS } from '../exam-bank.constants';
import { ExamAttemptProgressService } from './exam-attempt-progress.service';

const EXPIRE_BATCH = 50;

/**
 * Applies passed deadlines (plus grace) with the autosaved answers: an earlier
 * section of a sectioned paper moves on to the break, the last one is graded.
 */
@Injectable()
export class ExamAttemptExpiryService {
  private readonly logger = new Logger(ExamAttemptExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ExamAttemptProgressService,
  ) {}

  async expireOverdue(now: Date = new Date()): Promise<boolean> {
    const overdue = await this.prisma.examAttempt.findMany({
      where: {
        status: 'IN_PROGRESS',
        deadlineAt: { lt: new Date(now.getTime() - SUBMIT_GRACE_MS) },
      },
      include: { template: true },
      take: EXPIRE_BATCH,
    });
    for (const attempt of overdue) {
      await this.progress
        .settle(attempt, now)
        .catch((error: Error) =>
          this.logger.warn(
            `Attempt #${attempt.id} not settled: ${error.message}`,
          ),
        );
    }
    return overdue.length > 0;
  }
}

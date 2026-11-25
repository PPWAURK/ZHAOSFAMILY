import { ConflictException, Injectable } from '@nestjs/common';
import type { ExamAttempt, ExamTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readLayout } from './exam-sections';
import {
  gradeAttempt,
  type AttemptAnswer,
  type SnapshotQuestion,
} from './exam-grading';

/**
 * Grades an attempt and closes it exactly once: the conditional update only
 * matches while the attempt is still IN_PROGRESS, so a double submit (or the
 * expiry worker racing the employee) cannot grade it twice.
 */
@Injectable()
export class ExamAttemptGraderService {
  constructor(private readonly prisma: PrismaService) {}

  async finalize(
    attempt: ExamAttempt & { template: ExamTemplate },
    answers: AttemptAnswer[],
    status: 'SUBMITTED' | 'EXPIRED',
    now: Date = new Date(),
  ): Promise<void> {
    const grade = gradeAttempt(
      attempt.snapshot as SnapshotQuestion[],
      answers,
      attempt.template.passingScore,
      readLayout(attempt.layout)?.rules ?? [],
    );
    const updated = await this.prisma.examAttempt.updateMany({
      where: { id: attempt.id, status: 'IN_PROGRESS' },
      data: {
        status,
        activeKey: null,
        answers,
        results: grade.results,
        correctCount: grade.correctCount,
        score: grade.score,
        passed: grade.passed,
        ruleResults: grade.ruleResults,
        breakEndsAt: null,
        submittedAt: now,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException('EXAM_ATTEMPT_ALREADY_SUBMITTED');
    }
  }

  /**
   * Closes an overdue or force-collected attempt with its last autosaved
   * answers. Losing the race to another closer (employee submit, worker,
   * session close) is fine and silently ignored.
   */
  async expire(
    attempt: ExamAttempt & { template: ExamTemplate },
    now: Date = new Date(),
  ): Promise<void> {
    await this.finalize(
      attempt,
      (attempt.answers as AttemptAnswer[] | null) ?? [],
      'EXPIRED',
      now,
    ).catch((error: unknown) => {
      if (!(error instanceof ConflictException)) throw error;
    });
  }
}

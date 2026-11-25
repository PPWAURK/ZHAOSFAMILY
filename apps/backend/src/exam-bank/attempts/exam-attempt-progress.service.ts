import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SUBMIT_GRACE_MS } from '../exam-bank.constants';
import { ExamAttemptGraderService } from './exam-attempt-grader.service';
import type { AttemptWithTemplate } from './exam-attempt.view';
import type { AttemptAnswer } from './exam-grading';
import {
  isLastSection,
  isOnBreak,
  nextSectionTiming,
  readLayout,
  startNowTiming,
  type SectionTiming,
} from './exam-sections';

export function isOverdue(
  attempt: { deadlineAt: Date | null },
  now: Date = new Date(),
): boolean {
  return (
    attempt.deadlineAt !== null &&
    now.getTime() > attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS
  );
}

/** Safety net: a paper has at most a handful of sections. */
const MAX_SETTLE_STEPS = 10;

/**
 * Moves sectioned papers forward. Every write is conditional on the attempt
 * still being IN_PROGRESS in the expected section, so an employee submit, the
 * worker and a session close can race without skipping or repeating a step.
 */
@Injectable()
export class ExamAttemptProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grader: ExamAttemptGraderService,
  ) {}

  /**
   * Applies every deadline that has passed: an overdue section is closed with
   * its autosaved answers and the next one starts after the break; the last
   * one grades the paper as EXPIRED. Returns the fresh attempt.
   */
  async settle(
    attempt: AttemptWithTemplate,
    now: Date = new Date(),
  ): Promise<AttemptWithTemplate> {
    let current = attempt;
    for (let step = 0; step < MAX_SETTLE_STEPS; step += 1) {
      if (current.status !== 'IN_PROGRESS' || !isOverdue(current, now))
        return current;
      const layout = readLayout(current.layout);
      if (!layout || isLastSection(layout, current.sectionIndex)) {
        await this.grader.expire(current, now);
      } else {
        await this.move(
          current,
          nextSectionTiming(layout, current.sectionIndex, current.deadlineAt!),
        );
      }
      current = await this.reload(current.id);
    }
    return current;
  }

  /** The employee hands in a section that is not the last one. */
  async completeSection(
    attempt: AttemptWithTemplate,
    answers: AttemptAnswer[],
    now: Date = new Date(),
  ): Promise<void> {
    const layout = readLayout(attempt.layout)!;
    await this.move(
      attempt,
      nextSectionTiming(layout, attempt.sectionIndex, now),
      answers,
    );
  }

  /** Skips the rest of the break; ignored when the section already started. */
  async startSection(
    attempt: AttemptWithTemplate,
    sectionIndex: number,
    now: Date = new Date(),
  ): Promise<void> {
    const layout = readLayout(attempt.layout);
    if (
      !layout ||
      attempt.sectionIndex !== sectionIndex ||
      !isOnBreak(attempt, now)
    )
      return;
    await this.prisma.examAttempt.updateMany({
      where: {
        id: attempt.id,
        status: 'IN_PROGRESS',
        sectionIndex,
        breakEndsAt: attempt.breakEndsAt,
      },
      data: startNowTiming(layout, sectionIndex, now),
    });
  }

  private async move(
    attempt: AttemptWithTemplate,
    timing: SectionTiming,
    answers?: AttemptAnswer[],
  ): Promise<void> {
    await this.prisma.examAttempt.updateMany({
      where: {
        id: attempt.id,
        status: 'IN_PROGRESS',
        sectionIndex: attempt.sectionIndex,
      },
      data: { ...timing, ...(answers ? { answers } : {}) },
    });
  }

  private reload(id: number): Promise<AttemptWithTemplate> {
    return this.prisma.examAttempt.findUniqueOrThrow({
      where: { id },
      include: { template: true },
    });
  }
}

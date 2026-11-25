import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ExamAnswersDto,
  SubmitExamAnswersDto,
} from './dto/exam-answers.dto';
import { ExamAttemptGraderService } from './exam-attempt-grader.service';
import {
  ExamAttemptProgressService,
  isOverdue,
} from './exam-attempt-progress.service';
import { ExamAttemptStarterService } from './exam-attempt-starter.service';
import {
  toAttemptView,
  type AttemptWithTemplate,
  type ExamAttemptView,
} from './exam-attempt.view';
import {
  validateAnswers,
  type AttemptAnswer,
  type SnapshotQuestion,
} from './exam-grading';
import {
  isLastSection,
  isOnBreak,
  mergeSectionAnswers,
  readLayout,
} from './exam-sections';

export { isOverdue } from './exam-attempt-progress.service';

export const activeKeyFor = (userId: number, templateId: number) =>
  `u${userId}-t${templateId}`;

@Injectable()
export class ExamAttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grader: ExamAttemptGraderService,
    private readonly starter: ExamAttemptStarterService,
    private readonly progress: ExamAttemptProgressService,
  ) {}

  /**
   * Self-service exams: only active templates shown in the list. Templates
   * restricted to join codes are reachable through a session only.
   */
  async start(user: AuthUser, templateId: number): Promise<ExamAttemptView> {
    const template = await this.prisma.examTemplate.findFirst({
      where: { id: templateId, isActive: true, accessMode: 'LIST' },
    });
    if (!template) throw new NotFoundException('EXAM_TEMPLATE_NOT_FOUND');
    return this.starter.open(user, template, {
      activeKey: activeKeyFor(user.id, templateId),
      sessionId: null,
      endsAt: null,
      enforceMaxAttempts: true,
    });
  }

  async get(user: AuthUser, attemptId: number): Promise<ExamAttemptView> {
    const attempt = await this.findOwn(user.id, attemptId);
    return toAttemptView(await this.progress.settle(attempt));
  }

  async saveAnswers(
    user: AuthUser,
    attemptId: number,
    dto: ExamAnswersDto,
  ): Promise<{ savedAt: string }> {
    const attempt = await this.findOwnInProgress(user.id, attemptId);
    if (isOverdue(attempt)) throw new ConflictException('EXAM_ATTEMPT_EXPIRED');
    const answers = this.checkedAnswers(attempt, dto);
    await this.prisma.examAttempt.updateMany({
      where: {
        id: attemptId,
        status: 'IN_PROGRESS',
        sectionIndex: attempt.sectionIndex,
      },
      data: { answers },
    });
    return { savedAt: new Date().toISOString() };
  }

  /**
   * Hands in the current section: the last one grades the paper, an earlier
   * one starts the break. A late submit is applied with the autosaved answers;
   * a repeated submit of a section already handed in returns the fresh state.
   */
  async submit(
    user: AuthUser,
    attemptId: number,
    dto: SubmitExamAnswersDto,
  ): Promise<ExamAttemptView> {
    const found = await this.findOwnInProgress(user.id, attemptId);
    const attempt = await this.progress.settle(found);
    const isStale =
      attempt.status !== 'IN_PROGRESS' ||
      attempt.sectionIndex !== found.sectionIndex ||
      (dto.sectionIndex !== undefined &&
        dto.sectionIndex !== attempt.sectionIndex);
    if (!isStale) {
      if (isOnBreak(attempt))
        throw new ConflictException('EXAM_SECTION_ON_BREAK');
      const answers = this.checkedAnswers(attempt, dto);
      const layout = readLayout(attempt.layout);
      if (layout && !isLastSection(layout, attempt.sectionIndex)) {
        await this.progress.completeSection(attempt, answers);
      } else {
        await this.grader.finalize(attempt, answers, 'SUBMITTED');
      }
    }
    return toAttemptView(await this.findOwn(user.id, attemptId));
  }

  /** Ends the break early and starts the section clock. */
  async startSection(
    user: AuthUser,
    attemptId: number,
    sectionIndex: number,
  ): Promise<ExamAttemptView> {
    const attempt = await this.progress.settle(
      await this.findOwnInProgress(user.id, attemptId),
    );
    if (attempt.status === 'IN_PROGRESS')
      await this.progress.startSection(attempt, sectionIndex);
    return toAttemptView(await this.findOwn(user.id, attemptId));
  }

  /** Validates the client's answers and keeps other sections untouched. */
  private checkedAnswers(
    attempt: AttemptWithTemplate,
    dto: ExamAnswersDto,
  ): AttemptAnswer[] {
    const snapshot = attempt.snapshot as SnapshotQuestion[];
    const answers = dto.answers.map((a) => ({
      questionId: a.questionId,
      selectedKeys: a.selectedKeys,
    }));
    const error = validateAnswers(snapshot, answers);
    if (error) throw new BadRequestException(error);
    if (!readLayout(attempt.layout)) return answers;
    return mergeSectionAnswers(
      snapshot,
      (attempt.answers as AttemptAnswer[] | null) ?? [],
      answers,
      attempt.sectionIndex,
      isOnBreak(attempt),
    );
  }

  private async findOwn(
    userId: number,
    attemptId: number,
  ): Promise<AttemptWithTemplate> {
    const attempt = await this.prisma.examAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { template: true },
    });
    if (!attempt) throw new NotFoundException('EXAM_ATTEMPT_NOT_FOUND');
    return attempt;
  }

  private async findOwnInProgress(
    userId: number,
    attemptId: number,
  ): Promise<AttemptWithTemplate> {
    const attempt = await this.findOwn(userId, attemptId);
    if (attempt.status !== 'IN_PROGRESS')
      throw new ConflictException('EXAM_ATTEMPT_ALREADY_SUBMITTED');
    return attempt;
  }
}

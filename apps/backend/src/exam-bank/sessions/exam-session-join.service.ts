import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamAttemptStarterService } from '../attempts/exam-attempt-starter.service';
import type { ExamAttemptView } from '../attempts/exam-attempt.view';
import { JoinAttemptLimiter } from './join-attempt-limiter';

export const sessionActiveKey = (sessionId: number, userId: number) =>
  `s${sessionId}-u${userId}`;

/** An employee enters the examiner's code and gets (or resumes) their paper. */
@Injectable()
export class ExamSessionJoinService {
  private readonly limiter = new JoinAttemptLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly starter: ExamAttemptStarterService,
  ) {}

  async join(
    user: AuthUser,
    code: string,
    now: Date = new Date(),
  ): Promise<ExamAttemptView> {
    this.limiter.assertAllowed(user.id);
    const session = await this.prisma.examSession.findUnique({
      where: { activeCode: code },
      include: { template: true },
    });
    if (!session) {
      this.limiter.recordFailure(user.id);
      throw new NotFoundException('EXAM_SESSION_NOT_FOUND');
    }
    this.limiter.reset(user.id);
    if (
      session.status !== 'OPEN' ||
      (session.startsAt && session.startsAt > now)
    ) {
      throw new ConflictException('EXAM_SESSION_NOT_OPEN');
    }
    if (session.endsAt && session.endsAt <= now) {
      throw new ConflictException('EXAM_SESSION_ENDED');
    }
    if (session.requireRegistration) {
      const registration = await this.prisma.examSessionRegistration.findUnique(
        {
          where: {
            sessionId_userId: { sessionId: session.id, userId: user.id },
          },
          select: { id: true },
        },
      );
      if (!registration) throw new ForbiddenException('EXAM_NOT_REGISTERED');
    }
    const existing = await this.prisma.examAttempt.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: user.id } },
      select: { status: true },
    });
    if (existing && existing.status !== 'IN_PROGRESS') {
      throw new ConflictException('EXAM_SESSION_ALREADY_TAKEN');
    }
    return this.starter.open(user, session.template, {
      activeKey: sessionActiveKey(session.id, user.id),
      sessionId: session.id,
      endsAt: session.endsAt,
      enforceMaxAttempts: false,
    });
  }
}

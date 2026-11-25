import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.service';
import { ACCOUNT_STATUS } from '../../auth/account-status';
import {
  examRegistrationNotification,
  examSessionOpenNotification,
} from '../../notifications/notification-content';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ExamCandidateView,
  ExamRegistrationStatus,
  ExamRegistrationView,
  MyExamSessionView,
} from './exam-session.view';
import { assertCanManageSession } from './session-access';

const CANDIDATE_LIMIT = 50;

export type CandidateQuery = {
  restaurantId?: number;
  jobRole?: string;
  q?: string;
  sessionId?: number;
};

/** The roster of examinees an examiner picked for a session. */
@Injectable()
export class ExamSessionRegistrationsService {
  private readonly logger = new Logger(ExamSessionRegistrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    actor: AuthUser,
    sessionId: number,
  ): Promise<ExamRegistrationView[]> {
    const session = await this.loadSession(actor, sessionId);
    const [rows, attempts] = await Promise.all([
      this.prisma.examSessionRegistration.findMany({
        where: { sessionId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              jobRole: true,
              restaurant: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.examAttempt.findMany({
        where: { sessionId },
        select: { userId: true, status: true },
      }),
    ]);
    const attemptOf = new Map(attempts.map((a) => [a.userId, a.status]));
    return rows.map((row) => ({
      userId: row.user.id,
      name: row.user.name,
      restaurant: row.user.restaurant,
      jobRole: row.user.jobRole,
      status: registrationStatus(
        attemptOf.get(row.userId) ?? null,
        session.status === 'CLOSED',
      ),
      registeredAt: row.createdAt.toISOString(),
    }));
  }

  /** Idempotent: users already on the roster are skipped and not re-notified. */
  async add(
    actor: AuthUser,
    sessionId: number,
    userIds: number[],
  ): Promise<{ added: number }> {
    const session = await this.loadSession(actor, sessionId);
    if (session.status === 'CLOSED')
      throw new ConflictException('EXAM_SESSION_ALREADY_CLOSED');
    const added = await this.insertNew(actor, sessionId, userIds);
    await this.notify(added, session);
    return { added: added.length };
  }

  /** Same as add, for use while the session is being created. */
  async addForNewSession(
    actor: AuthUser,
    session: { id: number; template: { titleZh: string; titleFr: string } },
    userIds: number[],
  ): Promise<number> {
    const added = await this.insertNew(actor, session.id, userIds);
    await this.notify(added, session);
    return added.length;
  }

  async remove(
    actor: AuthUser,
    sessionId: number,
    userId: number,
  ): Promise<void> {
    await this.loadSession(actor, sessionId);
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
      select: { id: true },
    });
    if (attempt) throw new ConflictException('EXAM_REGISTRATION_HAS_ATTEMPT');
    const { count } = await this.prisma.examSessionRegistration.deleteMany({
      where: { sessionId, userId },
    });
    if (!count) throw new NotFoundException('EXAM_REGISTRATION_NOT_FOUND');
  }

  /** Tells everyone on the roster who has not submitted that the exam is open. */
  async notifyOpen(session: {
    id: number;
    template: { titleZh: string; titleFr: string };
  }): Promise<void> {
    const rows = await this.prisma.examSessionRegistration.findMany({
      where: { sessionId: session.id },
      select: { userId: true },
    });
    await this.notify(
      rows.map((r) => r.userId),
      session,
      examSessionOpenNotification,
    );
  }

  /** The signed-in user's upcoming and running sessions (never exposes codes). */
  async listMine(userId: number): Promise<MyExamSessionView[]> {
    const rows = await this.prisma.examSessionRegistration.findMany({
      where: { userId, session: { status: { not: 'CLOSED' } } },
      include: {
        session: {
          include: {
            template: true,
            examiner: { select: { name: true } },
            attempts: { where: { userId }, select: { status: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(({ session: s }) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      template: {
        titleZh: s.template.titleZh,
        titleFr: s.template.titleFr,
        timeLimitMinutes: s.template.timeLimitMinutes,
      },
      examiner: { name: s.examiner.name },
      startsAt: s.startsAt?.toISOString() ?? null,
      endsAt: s.endsAt?.toISOString() ?? null,
      attemptStatus: s.attempts[0]?.status ?? null,
    }));
  }

  async candidates(query: CandidateQuery): Promise<ExamCandidateView[]> {
    const name = query.q?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        accountStatus: ACCOUNT_STATUS.approved,
        ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
        ...(query.jobRole ? { jobRole: { contains: query.jobRole } } : {}),
        ...(name ? { name: { contains: name } } : {}),
      },
      select: {
        id: true,
        name: true,
        jobRole: true,
        restaurant: { select: { id: true, name: true } },
        examRegistrations: query.sessionId
          ? { where: { sessionId: query.sessionId }, select: { id: true } }
          : false,
      },
      orderBy: [{ restaurantId: 'asc' }, { name: 'asc' }],
      take: CANDIDATE_LIMIT,
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      restaurant: u.restaurant,
      jobRole: u.jobRole,
      isRegistered: (u.examRegistrations?.length ?? 0) > 0,
    }));
  }

  private async insertNew(
    actor: AuthUser,
    sessionId: number,
    userIds: number[],
  ): Promise<number[]> {
    const unique = [...new Set(userIds)];
    const [users, existing] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: unique }, accountStatus: ACCOUNT_STATUS.approved },
        select: { id: true },
      }),
      this.prisma.examSessionRegistration.findMany({
        where: { sessionId, userId: { in: unique } },
        select: { userId: true },
      }),
    ]);
    if (users.length !== unique.length)
      throw new NotFoundException('EXAM_REGISTRATION_USER_NOT_FOUND');
    const known = new Set(existing.map((r) => r.userId));
    const fresh = unique.filter((id) => !known.has(id));
    if (!fresh.length) return [];
    await this.prisma.examSessionRegistration.createMany({
      data: fresh.map((userId) => ({
        sessionId,
        userId,
        createdByUserId: actor.id,
      })),
      skipDuplicates: true,
    });
    return fresh;
  }

  /** Best effort: a push failure must not undo the registration. */
  private async notify(
    userIds: number[],
    session: { id: number; template: { titleZh: string; titleFr: string } },
    build: typeof examRegistrationNotification = examRegistrationNotification,
  ): Promise<void> {
    if (!userIds.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, preferredLanguage: true },
    });
    const byLanguage = new Map<string, number[]>();
    for (const u of users) {
      byLanguage.set(u.preferredLanguage, [
        ...(byLanguage.get(u.preferredLanguage) ?? []),
        u.id,
      ]);
    }
    try {
      for (const [language, ids] of byLanguage) {
        const title =
          language === 'fr'
            ? session.template.titleFr
            : session.template.titleZh;
        await this.notifications.sendToUsers(
          ids,
          build(language, session.id, title),
        );
      }
      if (build === examRegistrationNotification) {
        await this.prisma.examSessionRegistration.updateMany({
          where: { sessionId: session.id, userId: { in: userIds } },
          data: { notifiedAt: new Date() },
        });
      }
    } catch (error) {
      // The roster is the source of truth; users still see it in "my exams".
      this.logger.warn(
        `exam notification failed for session ${session.id}: ${(error as Error).message}`,
      );
    }
  }

  private async loadSession(actor: AuthUser, id: number) {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
      include: { template: true },
    });
    if (!session) throw new NotFoundException('EXAM_SESSION_NOT_FOUND');
    assertCanManageSession(actor, session);
    return session;
  }
}

function registrationStatus(
  attemptStatus: string | null,
  isSessionClosed: boolean,
): ExamRegistrationStatus {
  if (attemptStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (attemptStatus) return 'SUBMITTED';
  return isSessionClosed ? 'ABSENT' : 'NOT_STARTED';
}

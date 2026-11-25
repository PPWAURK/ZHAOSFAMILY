import { isOnBreak, readLayout } from '../attempts/exam-sections';
import { readBlueprint } from '../blueprint/exam-blueprint';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../../auth/auth.service';
import { EXAM_PERMISSIONS } from '../../auth/permissions';
import { PrismaService } from '../../prisma/prisma.service';
import type { AttemptAnswer } from '../attempts/exam-grading';
import { ExamTemplatesService } from '../templates/exam-templates.service';
import type { CreateExamSessionDto } from './dto/exam-session.dto';
import { ExamSessionCloserService } from './exam-session-closer.service';
import {
  toSessionView,
  type ExamSessionDetailView,
  type ExamSessionParticipantView,
  type ExamSessionTemplateOption,
  type ExamSessionView,
  type SessionWithRelations,
} from './exam-session.view';
import { generateSessionCode } from './session-code';

const SESSION_INCLUDE = {
  template: true,
  examiner: { select: { id: true, name: true } },
} as const;
const RECENT_SESSIONS = 50;
const CODE_ATTEMPTS = 8;

const canSeeAll = (user: AuthUser) =>
  user.permissions.includes(EXAM_PERMISSIONS.manageBank);

@Injectable()
export class ExamSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: ExamTemplatesService,
    private readonly closer: ExamSessionCloserService,
  ) {}

  async listTemplates(): Promise<ExamSessionTemplateOption[]> {
    const rows = await this.prisma.examTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((t) => ({
      id: t.id,
      titleZh: t.titleZh,
      titleFr: t.titleFr,
      questionCount: t.singleCount + t.multipleCount + t.booleanCount,
      timeLimitMinutes: t.timeLimitMinutes,
      sectionCount: readBlueprint(t.blueprint)?.sections.length ?? 1,
      accessMode: t.accessMode,
      isActive: t.isActive,
    }));
  }

  async create(
    user: AuthUser,
    dto: CreateExamSessionDto,
  ): Promise<ExamSessionView> {
    const template = await this.prisma.examTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException('EXAM_TEMPLATE_NOT_FOUND');
    if (!(await this.templates.isFillable(template)))
      throw new ConflictException('EXAM_POOL_INSUFFICIENT');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (
      (endsAt && endsAt <= new Date()) ||
      (startsAt && endsAt && startsAt >= endsAt)
    ) {
      throw new BadRequestException('EXAM_SESSION_WINDOW_INVALID');
    }
    const session = await this.createWithUniqueCode({
      templateId: template.id,
      label: dto.label?.trim() || null,
      examinerUserId: user.id,
      startsAt,
      endsAt,
    });
    return toSessionView(session, { participantCount: 0, submittedCount: 0 });
  }

  async list(user: AuthUser): Promise<ExamSessionView[]> {
    const sessions = await this.prisma.examSession.findMany({
      where: canSeeAll(user) ? {} : { examinerUserId: user.id },
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: RECENT_SESSIONS,
    });
    const counts = await this.prisma.examAttempt.groupBy({
      by: ['sessionId', 'status'],
      where: { sessionId: { in: sessions.map((s) => s.id) } },
      _count: { _all: true },
    });
    return sessions.map((session) => {
      const rows = counts.filter((c) => c.sessionId === session.id);
      return toSessionView(session, {
        participantCount: rows.reduce((sum, c) => sum + c._count._all, 0),
        submittedCount: rows
          .filter((c) => c.status !== 'IN_PROGRESS')
          .reduce((sum, c) => sum + c._count._all, 0),
      });
    });
  }

  async detail(user: AuthUser, id: number): Promise<ExamSessionDetailView> {
    const session = await this.findManageable(user, id);
    const attempts = await this.prisma.examAttempt.findMany({
      where: { sessionId: id },
      include: {
        user: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: 'asc' },
    });
    const participants: ExamSessionParticipantView[] = attempts.map((a) => ({
      attemptId: a.id,
      user: a.user,
      restaurant: a.restaurant,
      status: a.status,
      answeredCount: ((a.answers as AttemptAnswer[] | null) ?? []).filter(
        (x) => x.selectedKeys.length,
      ).length,
      totalCount: a.totalCount,
      score: a.score,
      passed: a.passed,
      startedAt: a.startedAt.toISOString(),
      deadlineAt: a.deadlineAt?.toISOString() ?? null,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      sectionIndex: a.sectionIndex,
      sectionCount: readLayout(a.layout)?.sections.length ?? 1,
      isOnBreak: a.status === 'IN_PROGRESS' && isOnBreak(a),
    }));
    return {
      ...toSessionView(session, {
        participantCount: participants.length,
        submittedCount: participants.filter((p) => p.status !== 'IN_PROGRESS')
          .length,
      }),
      serverNow: new Date().toISOString(),
      participants,
    };
  }

  async open(user: AuthUser, id: number): Promise<ExamSessionDetailView> {
    const session = await this.findManageable(user, id);
    if (session.status !== 'SCHEDULED')
      throw new ConflictException('EXAM_SESSION_NOT_SCHEDULED');
    if (session.endsAt && session.endsAt <= new Date())
      throw new ConflictException('EXAM_SESSION_ENDED');
    await this.prisma.examSession.updateMany({
      where: { id, status: 'SCHEDULED' },
      data: { status: 'OPEN', openedAt: new Date() },
    });
    return this.detail(user, id);
  }

  /** Ends the session: the code stops working and running attempts are collected. */
  async close(user: AuthUser, id: number): Promise<ExamSessionDetailView> {
    const session = await this.findManageable(user, id);
    if (session.status === 'CLOSED')
      throw new ConflictException('EXAM_SESSION_ALREADY_CLOSED');
    await this.closer.close(id);
    return this.detail(user, id);
  }

  private async createWithUniqueCode(
    data: Omit<Prisma.ExamSessionUncheckedCreateInput, 'code' | 'activeCode'>,
  ): Promise<SessionWithRelations> {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = generateSessionCode();
      try {
        return await this.prisma.examSession.create({
          data: { ...data, code, activeCode: code },
          include: SESSION_INCLUDE,
        });
      } catch (error) {
        const isCollision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002';
        if (!isCollision) throw error;
      }
    }
    throw new ConflictException('EXAM_SESSION_CODE_UNAVAILABLE');
  }

  /** Examiners see their own sessions; question-bank admins see every session. */
  private async findManageable(
    user: AuthUser,
    id: number,
  ): Promise<SessionWithRelations> {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('EXAM_SESSION_NOT_FOUND');
    if (session.examinerUserId !== user.id && !canSeeAll(user)) {
      throw new ForbiddenException('EXAM_SESSION_FORBIDDEN');
    }
    return session;
  }
}

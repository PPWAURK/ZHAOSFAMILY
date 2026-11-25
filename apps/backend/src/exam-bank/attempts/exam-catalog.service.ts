import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { readBlueprint } from '../blueprint/exam-blueprint';
import type { ExamCardView, MyAttemptView } from './exam-catalog.view';

const HISTORY_LIMIT = 200;

/** What an employee sees: active exams with their own progress, and their history. */
@Injectable()
export class ExamCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(userId: number): Promise<ExamCardView[]> {
    const [templates, attempts] = await Promise.all([
      // Code-only templates are reachable through an exam session, not the list.
      this.prisma.examTemplate.findMany({
        where: { isActive: true, accessMode: 'LIST' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.examAttempt.findMany({
        where: { userId, sessionId: null },
        select: {
          id: true,
          templateId: true,
          status: true,
          score: true,
          passed: true,
        },
      }),
    ]);
    return templates.map((t) => {
      const mine = attempts.filter((a) => a.templateId === t.id);
      const graded = mine.filter((a) => a.status !== 'IN_PROGRESS');
      const scores = graded.flatMap((a) => (a.score === null ? [] : [a.score]));
      return {
        templateId: t.id,
        titleZh: t.titleZh,
        titleFr: t.titleFr,
        descriptionZh: t.descriptionZh,
        descriptionFr: t.descriptionFr,
        questionCount: t.singleCount + t.multipleCount + t.booleanCount,
        timeLimitMinutes: t.timeLimitMinutes,
        sectionCount: readBlueprint(t.blueprint)?.sections.length ?? 1,
        passingScore: t.passingScore,
        maxAttempts: t.maxAttempts,
        attemptsUsed: graded.length,
        bestScore: scores.length ? Math.max(...scores) : null,
        hasPassed: graded.some((a) => a.passed),
        inProgressAttemptId:
          mine.find((a) => a.status === 'IN_PROGRESS')?.id ?? null,
      };
    });
  }

  async listMine(userId: number): Promise<MyAttemptView[]> {
    const rows = await this.prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: HISTORY_LIMIT,
      include: { template: { select: { titleZh: true, titleFr: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      templateId: row.templateId,
      titleZh: row.template.titleZh,
      titleFr: row.template.titleFr,
      status: row.status,
      score: row.score,
      passed: row.passed,
      totalCount: row.totalCount,
      startedAt: row.startedAt.toISOString(),
      submittedAt: row.submittedAt?.toISOString() ?? null,
    }));
  }
}

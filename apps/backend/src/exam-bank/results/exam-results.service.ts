import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toAttemptView } from '../attempts/exam-attempt.view';
import type {
  QuestionResult,
  SnapshotQuestion,
} from '../attempts/exam-grading';
import { resolvePage } from '../dto/pagination-query.dto';
import type { Paginated } from '../exam-bank.types';
import type { ListResultsQueryDto } from './dto/list-results-query.dto';
import type {
  ExamResultDetailView,
  ExamResultRowView,
  QuestionStatView,
} from './exam-results.view';

const RESULT_INCLUDE = {
  template: { select: { titleZh: true, titleFr: true } },
  user: { select: { id: true, name: true, email: true, jobRole: true } },
  restaurant: { select: { id: true, name: true } },
} as const;

/** Per-question rates use the most recent attempts only, to bound memory. */
const QUESTION_STATS_ATTEMPT_LIMIT = 2000;

type ResultRow = Prisma.ExamAttemptGetPayload<{
  include: typeof RESULT_INCLUDE;
}>;

export function buildResultsWhere(
  query: ListResultsQueryDto,
): Prisma.ExamAttemptWhereInput {
  const search = query.q?.trim();
  return {
    status: { in: ['SUBMITTED', 'EXPIRED'] },
    templateId: query.templateId,
    restaurantId: query.restaurantId,
    userId: query.userId,
    passed: query.passed,
    ...(query.from || query.to
      ? {
          submittedAt: {
            gte: query.from ? new Date(query.from) : undefined,
            lte: query.to ? new Date(query.to) : undefined,
          },
        }
      : {}),
    ...(search
      ? {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }
      : {}),
  };
}

function toRow(row: ResultRow): ExamResultRowView {
  return {
    id: row.id,
    templateId: row.templateId,
    titleZh: row.template.titleZh,
    titleFr: row.template.titleFr,
    user: row.user,
    restaurant: row.restaurant,
    status: row.status,
    score: row.score,
    passed: row.passed,
    correctCount: row.correctCount,
    totalCount: row.totalCount,
    startedAt: row.startedAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
    durationSeconds: row.submittedAt
      ? Math.round((row.submittedAt.getTime() - row.startedAt.getTime()) / 1000)
      : null,
  };
}

@Injectable()
export class ExamResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListResultsQueryDto,
  ): Promise<Paginated<ExamResultRowView>> {
    const { page, pageSize, skip } = resolvePage(query, 50);
    const where = buildResultsWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.examAttempt.findMany({
        where,
        include: RESULT_INCLUDE,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.examAttempt.count({ where }),
    ]);
    return { items: rows.map(toRow), total, page, pageSize };
  }

  async detail(attemptId: number): Promise<ExamResultDetailView> {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        template: true,
        user: RESULT_INCLUDE.user,
        restaurant: RESULT_INCLUDE.restaurant,
      },
    });
    if (!attempt) throw new NotFoundException('EXAM_ATTEMPT_NOT_FOUND');
    return {
      ...toAttemptView(attempt, true),
      user: attempt.user,
      restaurant: attempt.restaurant,
    };
  }

  /** Correct rate per question across graded attempts of a template, hardest first. */
  async questionStats(templateId: number): Promise<QuestionStatView[]> {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { templateId, status: { in: ['SUBMITTED', 'EXPIRED'] } },
      select: { snapshot: true, results: true },
      orderBy: { submittedAt: 'desc' },
      take: QUESTION_STATS_ATTEMPT_LIMIT,
    });
    const stats = new Map<number, QuestionStatView>();
    for (const attempt of attempts) {
      const questions = new Map(
        (attempt.snapshot as SnapshotQuestion[]).map((q) => [q.id, q]),
      );
      for (const result of (attempt.results as QuestionResult[] | null) ?? []) {
        const question = questions.get(result.questionId);
        if (!question) continue;
        const stat = stats.get(question.id) ?? {
          questionId: question.id,
          promptZh: question.promptZh,
          promptFr: question.promptFr,
          type: question.type,
          answeredCount: 0,
          correctCount: 0,
          correctRate: 0,
        };
        stat.answeredCount += 1;
        stat.correctCount += result.isCorrect ? 1 : 0;
        stat.correctRate = Math.round(
          (stat.correctCount / stat.answeredCount) * 100,
        );
        stats.set(question.id, stat);
      }
    }
    return [...stats.values()].sort(
      (a, b) =>
        a.correctRate - b.correctRate || b.answeredCount - a.answeredCount,
    );
  }
}

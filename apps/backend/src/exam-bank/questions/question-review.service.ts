import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolvePage } from '../dto/pagination-query.dto';
import {
  DEFAULT_DIFFICULTY,
  QUESTION_TYPES,
  type QuestionType,
} from '../exam-bank.constants';
import type {
  ExamQuestionView,
  Paginated,
  QuestionOption,
  QuestionStatsView,
} from '../exam-bank.types';
import type {
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
} from './dto/question.dto';
import type { ListQuestionsQueryDto } from './dto/list-questions-query.dto';
import type { BulkReviewDto, ReviewAction } from './dto/review.dto';
import { validateQuestion, type QuestionContent } from './question-rules';
import { QUESTION_INCLUDE, toQuestionView } from './question-view.mapper';

const STATUS_BY_ACTION: Record<ReviewAction, string> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  archive: 'ARCHIVED',
};

export function buildQuestionWhere(
  query: ListQuestionsQueryDto,
): Prisma.ExamQuestionWhereInput {
  const search = query.q?.trim();
  return {
    status: query.status,
    type: query.type,
    difficulty: query.difficulty,
    categoryId: query.categoryId,
    sourceMaterialId: query.materialId,
    generationJobId: query.jobId,
    ...(search
      ? {
          OR: [
            { promptZh: { contains: search } },
            { promptFr: { contains: search } },
            { knowledgePoint: { contains: search } },
          ],
        }
      : {}),
  };
}

function toContent(
  dto: UpdateExamQuestionDto,
  base?: QuestionContent,
): QuestionContent {
  return {
    type: dto.type ?? base?.type ?? ('' as QuestionType),
    difficulty: dto.difficulty ?? base?.difficulty ?? DEFAULT_DIFFICULTY,
    promptZh: (dto.promptZh ?? base?.promptZh ?? '').trim(),
    promptFr: (dto.promptFr ?? base?.promptFr ?? '').trim(),
    options:
      dto.options?.map((o) => ({
        key: o.key,
        zh: o.zh.trim(),
        fr: o.fr.trim(),
      })) ??
      base?.options ??
      [],
    correctKeys: dto.correctKeys ?? base?.correctKeys ?? [],
    explanationZh:
      dto.explanationZh !== undefined
        ? dto.explanationZh?.trim() || null
        : (base?.explanationZh ?? null),
    explanationFr:
      dto.explanationFr !== undefined
        ? dto.explanationFr?.trim() || null
        : (base?.explanationFr ?? null),
    knowledgePoint:
      dto.knowledgePoint !== undefined
        ? dto.knowledgePoint?.trim() || null
        : (base?.knowledgePoint ?? null),
  };
}

function assertValid(content: QuestionContent): void {
  const error = validateQuestion(content);
  if (error) throw new BadRequestException(error);
}

@Injectable()
export class QuestionReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ListQuestionsQueryDto,
  ): Promise<Paginated<ExamQuestionView>> {
    const { page, pageSize, skip } = resolvePage(query);
    const where = buildQuestionWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.examQuestion.findMany({
        where,
        include: QUESTION_INCLUDE,
        orderBy: { id: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.examQuestion.count({ where }),
    ]);
    return { items: rows.map(toQuestionView), total, page, pageSize };
  }

  async stats(): Promise<QuestionStatsView> {
    const [byStatus, byType, byCategory] = await Promise.all([
      this.prisma.examQuestion.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.examQuestion.groupBy({
        by: ['type'],
        where: { status: 'APPROVED' },
        _count: { _all: true },
      }),
      this.prisma.examQuestion.groupBy({
        by: ['categoryId'],
        where: { status: 'APPROVED' },
        _count: { _all: true },
      }),
    ]);
    const approvedByType = Object.fromEntries(
      QUESTION_TYPES.map((t) => [t, 0]),
    ) as Record<QuestionType, number>;
    byType.forEach(
      (row) => (approvedByType[row.type as QuestionType] = row._count._all),
    );
    return {
      byStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
      approvedByType,
      approvedByCategory: byCategory.map((row) => ({
        categoryId: row.categoryId,
        count: row._count._all,
      })),
    };
  }

  /** Questions written by an admin are approved straight away. */
  async create(
    dto: CreateExamQuestionDto,
    userId: number,
  ): Promise<ExamQuestionView> {
    const content = toContent(dto);
    assertValid(content);
    const row = await this.prisma.examQuestion.create({
      data: {
        ...content,
        categoryId: dto.categoryId ?? null,
        origin: 'MANUAL',
        status: 'APPROVED',
        reviewedByUserId: userId,
        reviewedAt: new Date(),
      },
      include: QUESTION_INCLUDE,
    });
    return toQuestionView(row);
  }

  async update(
    id: number,
    dto: UpdateExamQuestionDto,
  ): Promise<ExamQuestionView> {
    const existing = await this.findOrThrow(id);
    const base: QuestionContent = {
      ...existing,
      type: existing.type as QuestionType,
      difficulty: existing.difficulty as QuestionContent['difficulty'],
      options: existing.options as QuestionOption[],
      correctKeys: existing.correctKeys as string[],
    };
    const content = toContent(dto, base);
    assertValid(content);
    const promptChanged = content.promptZh !== existing.promptZh;
    const row = await this.prisma.examQuestion.update({
      where: { id },
      data: {
        ...content,
        categoryId:
          dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
        ...(promptChanged
          ? { promptEmbedding: null, embeddingModel: null }
          : {}),
      },
      include: QUESTION_INCLUDE,
    });
    return toQuestionView(row);
  }

  async review(
    id: number,
    action: ReviewAction,
    userId: number,
    reason?: string,
  ): Promise<ExamQuestionView> {
    await this.findOrThrow(id);
    await this.bulkReview({ ids: [id], action, reason }, userId);
    return toQuestionView(
      await this.prisma.examQuestion.findUniqueOrThrow({
        where: { id },
        include: QUESTION_INCLUDE,
      }),
    );
  }

  async bulkReview(
    dto: BulkReviewDto,
    userId: number,
  ): Promise<{ updated: number }> {
    const result = await this.prisma.examQuestion.updateMany({
      where: { id: { in: [...new Set(dto.ids)] } },
      data: {
        status: STATUS_BY_ACTION[dto.action],
        reviewedByUserId: userId,
        reviewedAt: new Date(),
        rejectReason:
          dto.action === 'reject' ? dto.reason?.trim() || null : null,
      },
    });
    return { updated: result.count };
  }

  private async findOrThrow(id: number) {
    const row = await this.prisma.examQuestion.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('EXAM_QUESTION_NOT_FOUND');
    return row;
  }
}

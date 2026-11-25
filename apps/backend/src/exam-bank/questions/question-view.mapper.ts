import type { ExamCategory, ExamQuestion } from '@prisma/client';
import type {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
} from '../exam-bank.constants';
import type {
  ExamCategoryView,
  ExamQuestionView,
  QuestionOption,
} from '../exam-bank.types';

export type QuestionWithRelations = ExamQuestion & {
  category: ExamCategory | null;
  sourceMaterial: { id: number; title: string } | null;
};

export const QUESTION_INCLUDE = {
  category: true,
  sourceMaterial: { select: { id: true, title: true } },
} as const;

export function toCategoryView(category: ExamCategory): ExamCategoryView {
  return {
    id: category.id,
    code: category.code,
    nameZh: category.nameZh,
    nameFr: category.nameFr,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
  };
}

export function toQuestionView(row: QuestionWithRelations): ExamQuestionView {
  return {
    id: row.id,
    type: row.type as QuestionType,
    status: row.status as QuestionStatus,
    origin: row.origin,
    difficulty: row.difficulty as QuestionDifficulty,
    category: row.category ? toCategoryView(row.category) : null,
    promptZh: row.promptZh,
    promptFr: row.promptFr,
    options: row.options as QuestionOption[],
    correctKeys: row.correctKeys as string[],
    explanationZh: row.explanationZh,
    explanationFr: row.explanationFr,
    evidence: row.evidence,
    knowledgePoint: row.knowledgePoint,
    sourceMaterial: row.sourceMaterial,
    sourceChunkId: row.sourceChunkId,
    generationJobId: row.generationJobId,
    rejectReason: row.rejectReason,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

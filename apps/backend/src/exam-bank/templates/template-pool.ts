import type { Prisma } from '@prisma/client';
import { QUESTION_TYPES, type QuestionType } from '../exam-bank.constants';

export type PoolFilters = {
  categoryIds?: number[] | null;
  materialIds?: number[] | null;
  difficulties?: string[] | null;
};

export type TypeCounts = Record<QuestionType, number>;

export type PoolCheckView = {
  requested: TypeCounts;
  available: TypeCounts;
  isSufficient: boolean;
};

/** Reads the JSON filter columns of a stored template. */
export function templateFilters(template: {
  categoryIds: unknown;
  materialIds: unknown;
  difficulties: unknown;
}): PoolFilters {
  return {
    categoryIds: (template.categoryIds as number[] | null) ?? null,
    materialIds: (template.materialIds as number[] | null) ?? null,
    difficulties: (template.difficulties as string[] | null) ?? null,
  };
}

const nonEmpty = (list?: readonly unknown[] | null) =>
  list && list.length ? list : null;

/** Where clause for the APPROVED questions a template may draw from. */
export function poolWhere(
  filters: PoolFilters,
  type?: QuestionType,
): Prisma.ExamQuestionWhereInput {
  const categoryIds = nonEmpty(filters.categoryIds) as number[] | null;
  const materialIds = nonEmpty(filters.materialIds) as number[] | null;
  const difficulties = nonEmpty(filters.difficulties) as string[] | null;
  return {
    status: 'APPROVED',
    ...(type ? { type } : {}),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(materialIds ? { sourceMaterialId: { in: materialIds } } : {}),
    ...(difficulties ? { difficulty: { in: difficulties } } : {}),
  };
}

export function isPoolSufficient(
  requested: TypeCounts,
  available: TypeCounts,
): boolean {
  return QUESTION_TYPES.every((type) => available[type] >= requested[type]);
}

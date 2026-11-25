import type { ExamTemplate } from '@prisma/client';
import { readBlueprint, type ExamBlueprint } from '../blueprint/exam-blueprint';

export type ExamTemplateView = {
  id: number;
  titleZh: string;
  titleFr: string;
  descriptionZh: string | null;
  descriptionFr: string | null;
  singleCount: number;
  multipleCount: number;
  booleanCount: number;
  questionCount: number;
  categoryIds: number[];
  materialIds: number[];
  difficulties: string[];
  timeLimitMinutes: number | null;
  passingScore: number;
  maxAttempts: number | null;
  shuffleOptions: boolean;
  showExplanations: boolean;
  isActive: boolean;
  accessMode: string;
  /** Sectioned paper rules; null for a simple template. */
  blueprint: ExamBlueprint | null;
  sectionCount: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
};

export function toTemplateView(
  row: ExamTemplate,
  attemptCount: number,
): ExamTemplateView {
  const blueprint = readBlueprint(row.blueprint);
  return {
    id: row.id,
    titleZh: row.titleZh,
    titleFr: row.titleFr,
    descriptionZh: row.descriptionZh,
    descriptionFr: row.descriptionFr,
    singleCount: row.singleCount,
    multipleCount: row.multipleCount,
    booleanCount: row.booleanCount,
    questionCount: row.singleCount + row.multipleCount + row.booleanCount,
    categoryIds: (row.categoryIds as number[] | null) ?? [],
    materialIds: (row.materialIds as number[] | null) ?? [],
    difficulties: (row.difficulties as string[] | null) ?? [],
    timeLimitMinutes: row.timeLimitMinutes,
    passingScore: row.passingScore,
    maxAttempts: row.maxAttempts,
    shuffleOptions: row.shuffleOptions,
    showExplanations: row.showExplanations,
    isActive: row.isActive,
    accessMode: row.accessMode,
    blueprint,
    sectionCount: blueprint?.sections.length ?? 1,
    attemptCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

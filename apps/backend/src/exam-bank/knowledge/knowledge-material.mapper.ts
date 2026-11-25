import type { ExamKnowledgeMaterial } from '@prisma/client';
import type { DifficultyCounts } from '../blueprint/exam-blueprint';
import type { KnowledgeMaterialView } from '../exam-bank.types';

export function materialTargets(
  row: Pick<
    ExamKnowledgeMaterial,
    'targetRecall' | 'targetUnderstand' | 'targetScenario'
  >,
): DifficultyCounts | null {
  if (
    row.targetRecall === null &&
    row.targetUnderstand === null &&
    row.targetScenario === null
  )
    return null;
  return {
    recall: row.targetRecall ?? 0,
    understand: row.targetUnderstand ?? 0,
    scenario: row.targetScenario ?? 0,
  };
}

export function toKnowledgeMaterialView(
  row: ExamKnowledgeMaterial,
): KnowledgeMaterialView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    language: row.language,
    status: row.status,
    errorCode: row.errorCode,
    charCount: row.charCount,
    chunkCount: row.chunkCount,
    categoryId: row.categoryId,
    targets: materialTargets(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

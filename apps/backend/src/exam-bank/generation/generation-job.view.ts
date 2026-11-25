import type { ExamGenerationJob } from '@prisma/client';
import type { TypeMix } from '../exam-bank.types';

export type GenerationJobView = {
  id: number;
  status: string;
  mode: string;
  requestedCount: number;
  plannedCount: number;
  materialIds: number[];
  typeMix: TypeMix;
  model: string;
  round: number;
  totalRequests: number;
  succeededRequests: number;
  failedRequests: number;
  generatedCount: number;
  keptCount: number;
  duplicateCount: number;
  invalidCount: number;
  draftCount: number;
  inputTokens: number;
  outputTokens: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type GenerationEstimateView = {
  plannedCount: number;
  requestCount: number;
  maxPossible: number;
  isCapped: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number | null;
};

export function toGenerationJobView(
  job: ExamGenerationJob,
  draftCount: number,
): GenerationJobView {
  return {
    id: job.id,
    status: job.status,
    mode: job.mode,
    requestedCount: job.requestedCount,
    plannedCount: job.plannedCount,
    materialIds: job.materialIds as number[],
    typeMix: job.typeMix as TypeMix,
    model: job.model,
    round: job.round,
    totalRequests: job.totalRequests,
    succeededRequests: job.succeededRequests,
    failedRequests: job.failedRequests,
    generatedCount: job.generatedCount,
    keptCount: job.keptCount,
    duplicateCount: job.duplicateCount,
    invalidCount: job.invalidCount,
    draftCount,
    inputTokens: job.inputTokens,
    outputTokens: job.outputTokens,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

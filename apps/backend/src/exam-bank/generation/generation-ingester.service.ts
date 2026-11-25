import { Injectable } from '@nestjs/common';
import type {
  ExamGenerationJob,
  ExamGenerationRequest,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { packVector } from '../embeddings/vector-codec';
import type { QuestionDifficulty } from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import type { DedupContext } from '../questions/question-dedup';
import { QuestionDedupService } from '../questions/question-dedup.service';
import { evaluateBatchResult, type BatchResultOutcome } from './batch-result';
import { ClaudeBatchClient } from './claude-batch.client';

type IngestContext = {
  job: ExamGenerationJob;
  categoryIds: Map<string, number>;
  chunkMaterials: Map<number, number>;
  /** A material's own category overrides the model's guess. */
  materialCategories: Map<number, number>;
  dedup: DedupContext;
};

/**
 * Reads a finished batch and stores each request's questions as DRAFTs.
 * Idempotent: only requests still SUBMITTED are handled, so a crash mid-way
 * resumes on the next tick without duplicating rows.
 */
@Injectable()
export class GenerationIngesterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeBatchClient,
    private readonly dedup: QuestionDedupService,
  ) {}

  async ingest(job: ExamGenerationJob): Promise<void> {
    if (!job.currentBatchId) return;
    const requests = await this.prisma.examGenerationRequest.findMany({
      where: {
        jobId: job.id,
        batchId: job.currentBatchId,
        status: 'SUBMITTED',
      },
    });
    if (!requests.length) return;
    const byCustomId = new Map(requests.map((r) => [r.customId, r]));
    const context = await this.loadContext(job, requests);

    for await (const response of this.claude.results(job.currentBatchId)) {
      const request = byCustomId.get(response.custom_id);
      if (!request) continue;
      byCustomId.delete(response.custom_id);
      const outcome = evaluateBatchResult(
        response,
        request.quota as TypeMix,
        context.categoryIds,
        request.difficulty as QuestionDifficulty | null,
      );
      await this.persist(request, outcome, context);
    }
    await this.retryMissing([...byCustomId.values()].map((r) => r.id));
  }

  /** Requests the batch returned no result for are retried, never left SUBMITTED. */
  private async retryMissing(requestIds: number[]): Promise<void> {
    if (!requestIds.length) return;
    await this.prisma.examGenerationRequest.updateMany({
      where: { id: { in: requestIds }, status: 'SUBMITTED' },
      data: { status: 'RETRY', errorType: 'missing_result' },
    });
  }

  private async persist(
    request: ExamGenerationRequest,
    outcome: BatchResultOutcome,
    context: IngestContext,
  ): Promise<void> {
    const tokens = {
      inputTokens: { increment: outcome.inputTokens },
      outputTokens: { increment: outcome.outputTokens },
    };
    if (outcome.kind !== 'parsed') {
      await this.prisma.$transaction([
        this.prisma.examGenerationRequest.update({
          where: { id: request.id },
          data: {
            status: outcome.kind === 'retry' ? 'RETRY' : 'FAILED',
            errorType: outcome.errorType,
          },
        }),
        this.prisma.examGenerationJob.update({
          where: { id: context.job.id },
          data: {
            ...tokens,
            failedRequests: { increment: outcome.kind === 'failed' ? 1 : 0 },
          },
        }),
      ]);
      return;
    }

    const { kept, duplicateCount } = await this.dedup.filter(
      outcome.questions,
      context.dedup,
    );
    const materialId = context.chunkMaterials.get(request.chunkId) ?? null;
    const materialCategory =
      materialId === null
        ? undefined
        : context.materialCategories.get(materialId);
    const rows: Prisma.ExamQuestionCreateManyInput[] = kept.map(
      ({ item, vector }) => ({
        ...item,
        categoryId: materialCategory ?? item.categoryId,
        options: item.options,
        correctKeys: item.correctKeys,
        status: 'DRAFT',
        origin: 'AI',
        promptEmbedding: vector ? packVector(vector) : null,
        embeddingModel: vector ? this.dedup.embeddingModel : null,
        sourceChunkId: request.chunkId,
        sourceMaterialId: materialId,
        generationJobId: context.job.id,
      }),
    );
    await this.prisma.$transaction([
      this.prisma.examQuestion.createMany({ data: rows }),
      this.prisma.examGenerationRequest.update({
        where: { id: request.id },
        data: {
          status: 'SUCCEEDED',
          producedCount: outcome.questions.length + outcome.invalidCount,
          keptCount: rows.length,
        },
      }),
      this.prisma.examGenerationJob.update({
        where: { id: context.job.id },
        data: {
          ...tokens,
          succeededRequests: { increment: 1 },
          generatedCount: {
            increment: outcome.questions.length + outcome.invalidCount,
          },
          invalidCount: { increment: outcome.invalidCount },
          duplicateCount: { increment: duplicateCount },
          keptCount: { increment: rows.length },
        },
      }),
    ]);
  }

  private async loadContext(
    job: ExamGenerationJob,
    requests: ExamGenerationRequest[],
  ): Promise<IngestContext> {
    const [categories, chunks, dedup] = await Promise.all([
      this.prisma.examCategory.findMany({ select: { id: true, code: true } }),
      this.prisma.examKnowledgeChunk.findMany({
        where: { id: { in: [...new Set(requests.map((r) => r.chunkId))] } },
        select: {
          id: true,
          materialId: true,
          material: { select: { categoryId: true } },
        },
      }),
      this.dedup.loadContext(),
    ]);
    return {
      job,
      categoryIds: new Map(categories.map((c) => [c.code, c.id])),
      chunkMaterials: new Map(chunks.map((c) => [c.id, c.materialId])),
      materialCategories: new Map(
        chunks.flatMap((c) =>
          c.material.categoryId === null
            ? []
            : [[c.materialId, c.material.categoryId] as const],
        ),
      ),
      dedup,
    };
  }
}

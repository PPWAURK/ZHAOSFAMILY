import { Injectable, Logger } from '@nestjs/common';
import type { ExamGenerationJob, ExamGenerationRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ExamAiEffort } from '../config/exam-bank-config.service';
import {
  selectRelatedChunks,
  type IndexedChunk,
} from '../embeddings/knowledge-retrieval';
import { KnowledgeRetrievalService } from '../embeddings/knowledge-retrieval.service';
import type { QuestionDifficulty } from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import { ClaudeBatchClient } from './claude-batch.client';
import { buildBatchRequest, type PromptCategory } from './generation-prompt';

const EXCLUSION_LIST_SIZE = 15;

export function buildCustomId(
  request: Pick<ExamGenerationRequest, 'jobId' | 'id' | 'attempt'>,
): string {
  return `j${request.jobId}-r${request.id}-a${request.attempt}`;
}

type SubmissionContext = {
  chunks: Map<number, IndexedChunk>;
  index: IndexedChunk[];
  titles: Map<number, string>;
  categories: PromptCategory[];
  existing: Map<number, string[]>;
};

/** Builds one Message Batch for every PENDING request of the job's current round. */
@Injectable()
export class GenerationSubmitterService {
  private readonly logger = new Logger(GenerationSubmitterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly claude: ClaudeBatchClient,
  ) {}

  /** Returns false when the round has nothing left to submit. */
  async submitRound(job: ExamGenerationJob): Promise<boolean> {
    const pending = await this.prisma.examGenerationRequest.findMany({
      where: { jobId: job.id, round: job.round, status: 'PENDING' },
      orderBy: { id: 'asc' },
    });
    if (!pending.length) return false;

    await this.prisma.examGenerationJob.updateMany({
      where: { id: job.id, status: { not: 'CANCELING' } },
      data: { status: 'SUBMITTING', startedAt: job.startedAt ?? new Date() },
    });
    const context = await this.loadContext(job, pending);
    const submittable = pending.filter((r) => context.chunks.has(r.chunkId));
    await this.failMissingChunks(pending, context);
    if (!submittable.length) return false;

    if (submittable.some((r) => r.customId)) {
      // customIds are written just before batches.create: a crash may have
      // left an orphan batch for this round (billed, its results are ignored).
      this.logger.warn(
        `Generation job #${job.id} round ${job.round} resubmitted; a previous batch may be orphaned.`,
      );
    }
    const withIds = submittable.map((r) => ({
      ...r,
      customId: buildCustomId(r),
    }));
    await this.prisma.$transaction(
      withIds.map((r) =>
        this.prisma.examGenerationRequest.update({
          where: { id: r.id },
          data: { customId: r.customId },
        }),
      ),
    );
    const batch = await this.claude.create(
      withIds.map((r) =>
        buildBatchRequest(
          r.customId,
          this.promptInput(r, context),
          job.model,
          job.effort as ExamAiEffort,
        ),
      ),
    );
    await this.recordSubmission(
      job.id,
      withIds.map((r) => r.id),
      batch.id,
    );
    return true;
  }

  /**
   * Stores the batch id. If the admin canceled while the batch was being
   * created, the conditional update leaves the job CANCELING and the batch is
   * canceled too, so the runner ingests whatever finished and ends the job.
   */
  private async recordSubmission(
    jobId: number,
    requestIds: number[],
    batchId: string,
  ): Promise<void> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.examGenerationJob.updateMany({
        where: { id: jobId, status: { not: 'CANCELING' } },
        data: {
          status: 'BATCH_RUNNING',
          currentBatchId: batchId,
          totalRequests: { increment: requestIds.length },
        },
      }),
      this.prisma.examGenerationRequest.updateMany({
        where: { id: { in: requestIds } },
        data: { status: 'SUBMITTED', batchId },
      }),
    ]);
    if (updated.count === 0) {
      await this.prisma.examGenerationJob.update({
        where: { id: jobId },
        data: { currentBatchId: batchId },
      });
      await this.claude.cancel(batchId);
    }
  }

  private promptInput(
    request: ExamGenerationRequest,
    context: SubmissionContext,
  ) {
    const chunk = context.chunks.get(request.chunkId)!;
    return {
      materialTitle: context.titles.get(chunk.materialId) ?? '',
      quota: request.quota as TypeMix,
      variant: request.variant,
      variantCount: request.variantCount,
      difficulty: request.difficulty as QuestionDifficulty | null,
      categories: context.categories,
      existingPrompts: context.existing.get(chunk.id) ?? [],
      source: chunk.content,
      related: selectRelatedChunks(chunk, context.index).map((c) => c.content),
    };
  }

  private async loadContext(
    job: ExamGenerationJob,
    pending: ExamGenerationRequest[],
  ): Promise<SubmissionContext> {
    const materialIds = job.materialIds as number[];
    const chunkIds = [...new Set(pending.map((r) => r.chunkId))];
    const [index, materials, categories, existingRows] = await Promise.all([
      this.retrieval.loadIndex(materialIds),
      this.prisma.examKnowledgeMaterial.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, title: true },
      }),
      this.prisma.examCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { code: true, nameZh: true, nameFr: true },
      }),
      this.prisma.examQuestion.findMany({
        where: { sourceChunkId: { in: chunkIds } },
        orderBy: { id: 'desc' },
        select: { sourceChunkId: true, promptZh: true },
      }),
    ]);
    const existing = new Map<number, string[]>();
    for (const row of existingRows) {
      const list = existing.get(row.sourceChunkId!) ?? [];
      if (list.length < EXCLUSION_LIST_SIZE) list.push(row.promptZh);
      existing.set(row.sourceChunkId!, list);
    }
    return {
      index,
      chunks: new Map(index.map((c) => [c.id, c])),
      titles: new Map(materials.map((m) => [m.id, m.title])),
      categories,
      existing,
    };
  }

  private async failMissingChunks(
    pending: ExamGenerationRequest[],
    context: SubmissionContext,
  ): Promise<void> {
    const missing = pending
      .filter((r) => !context.chunks.has(r.chunkId))
      .map((r) => r.id);
    if (missing.length) {
      await this.prisma.examGenerationRequest.updateMany({
        where: { id: { in: missing } },
        data: { status: 'FAILED', errorType: 'chunk_missing' },
      });
    }
  }
}

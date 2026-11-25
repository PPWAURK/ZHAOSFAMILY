import Anthropic from '@anthropic-ai/sdk';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { ExamGenerationJob, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ACTIVE_JOB_STATUSES,
  MAX_GENERATION_ROUNDS,
} from '../exam-bank.constants';
import {
  emptyDifficultyCounts,
  type DifficultyCounts,
} from '../blueprint/exam-blueprint';
import type { QuestionDifficulty } from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import { claimRow, releaseRow } from '../worker/row-lock';
import { ClaudeBatchClient } from './claude-batch.client';
import { halveQuota, mixTotal } from './generation-planner';
import { GenerationIngesterService } from './generation-ingester.service';
import { GenerationPlanningService } from './generation-planning.service';
import { GenerationSubmitterService } from './generation-submitter.service';

const TOP_UP_THRESHOLD = 0.9;
const SPLIT_ON_RETRY = new Set(['max_tokens', 'invalid_json']);
const JOBS_PER_TICK = 5;

/** Errors that will not go away by retrying on the next tick. */
function permanentErrorCode(error: unknown): string | null {
  if (error instanceof Anthropic.AuthenticationError)
    return 'EXAM_AI_UNAUTHORIZED';
  if (error instanceof Anthropic.PermissionDeniedError)
    return 'EXAM_AI_FORBIDDEN';
  if (error instanceof Anthropic.BadRequestError) return 'EXAM_AI_BAD_REQUEST';
  if (error instanceof HttpException) return String(error.message);
  return null;
}

/**
 * Advances generation jobs one step per worker tick:
 * PLANNED/SUBMITTING → BATCH_RUNNING → INGESTING → next round or COMPLETED.
 * CANCELING jobs ingest whatever finished, then end as CANCELED.
 */
@Injectable()
export class GenerationBatchRunnerService {
  private readonly logger = new Logger(GenerationBatchRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claude: ClaudeBatchClient,
    private readonly submitter: GenerationSubmitterService,
    private readonly ingester: GenerationIngesterService,
    private readonly planning: GenerationPlanningService,
  ) {}

  async advanceActiveJobs(): Promise<boolean> {
    const jobs = await this.prisma.examGenerationJob.findMany({
      where: { status: { in: [...ACTIVE_JOB_STATUSES] } },
      orderBy: { id: 'asc' },
      take: JOBS_PER_TICK,
    });
    for (const job of jobs) {
      if (!(await claimRow(this.prisma.examGenerationJob, job.id))) continue;
      try {
        await this.step(job);
      } catch (error) {
        await this.handleStepError(job, error);
      } finally {
        await releaseRow(this.prisma.examGenerationJob, job.id);
      }
    }
    return jobs.length > 0;
  }

  async step(job: ExamGenerationJob): Promise<void> {
    if (job.status === 'PLANNED' || job.status === 'SUBMITTING') {
      if (!(await this.submitter.submitRound(job))) await this.closeRound(job);
      return;
    }
    if (job.status === 'BATCH_RUNNING' || job.status === 'CANCELING') {
      if (!job.currentBatchId) return this.closeRound(job);
      const batch = await this.claude.retrieve(job.currentBatchId);
      if (batch.processing_status !== 'ended') return;
      if (job.status === 'BATCH_RUNNING')
        // Conditional: a cancel issued meanwhile must stay CANCELING.
        await this.prisma.examGenerationJob.updateMany({
          where: { id: job.id, status: 'BATCH_RUNNING' },
          data: { status: 'INGESTING' },
        });
    }
    await this.ingester.ingest(job);
    await this.closeRound(job);
  }

  private async closeRound(job: ExamGenerationJob): Promise<void> {
    const fresh = await this.prisma.examGenerationJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    if (fresh.status === 'CANCELING') {
      return this.finish(fresh, 'CANCELED');
    }
    const nextRound = fresh.round + 1;
    const next =
      fresh.round < MAX_GENERATION_ROUNDS
        ? await this.nextRoundRequests(fresh, nextRound)
        : [];
    if (!next.length) {
      return this.finish(fresh, fresh.keptCount > 0 ? 'COMPLETED' : 'FAILED');
    }
    await this.prisma.$transaction([
      this.prisma.examGenerationRequest.createMany({ data: next }),
      this.prisma.examGenerationJob.update({
        where: { id: fresh.id },
        data: { round: nextRound, status: 'PLANNED', currentBatchId: null },
      }),
    ]);
  }

  /** Retries of this round (halved when truncated) plus a top-up when short. */
  private async nextRoundRequests(
    job: ExamGenerationJob,
    nextRound: number,
  ): Promise<Prisma.ExamGenerationRequestCreateManyInput[]> {
    const retries = await this.prisma.examGenerationRequest.findMany({
      where: { jobId: job.id, round: job.round, status: 'RETRY' },
    });
    const next: Prisma.ExamGenerationRequestCreateManyInput[] = retries.flatMap(
      (r) =>
        (SPLIT_ON_RETRY.has(r.errorType ?? '')
          ? halveQuota(r.quota as TypeMix)
          : [r.quota as TypeMix]
        ).map((quota) => ({
          jobId: job.id,
          chunkId: r.chunkId,
          round: nextRound,
          quota,
          variant: r.variant,
          variantCount: r.variantCount,
          difficulty: r.difficulty,
          attempt: r.attempt + 1,
        })),
    );
    if (job.mode === 'TARGET') {
      next.push(...(await this.targetTopUp(job, next, nextRound)));
      return next;
    }
    const expected = next.reduce(
      (sum, r) => sum + mixTotal(r.quota as TypeMix),
      0,
    );
    const deficit = job.requestedCount - job.keptCount - expected;
    if (job.keptCount < job.requestedCount * TOP_UP_THRESHOLD && deficit > 0) {
      const plan = await this.planning.plan(
        job.materialIds as number[],
        deficit,
        job.typeMix as TypeMix,
      );
      next.push(
        ...plan.requests.map((r) => ({
          ...r,
          jobId: job.id,
          round: nextRound,
        })),
      );
    }
    return next;
  }

  /** Target jobs re-measure the gap; retries already queued count as coming. */
  private async targetTopUp(
    job: ExamGenerationJob,
    retries: readonly Prisma.ExamGenerationRequestCreateManyInput[],
    nextRound: number,
  ): Promise<Prisma.ExamGenerationRequestCreateManyInput[]> {
    const chunks = await this.prisma.examKnowledgeChunk.findMany({
      where: { id: { in: retries.map((r) => r.chunkId) } },
      select: { id: true, materialId: true },
    });
    const materialOf = new Map(chunks.map((c) => [c.id, c.materialId]));
    const pending = new Map<number, DifficultyCounts>();
    for (const retry of retries) {
      const materialId = materialOf.get(retry.chunkId);
      const difficulty = retry.difficulty as QuestionDifficulty | null;
      if (materialId === undefined || !difficulty) continue;
      const counts = pending.get(materialId) ?? emptyDifficultyCounts();
      counts[difficulty] += mixTotal(retry.quota as TypeMix);
      pending.set(materialId, counts);
    }
    const plan = await this.planning.planTargetGaps(
      job.materialIds as number[],
      pending,
    );
    return plan.requests.map((r) => ({
      ...r,
      jobId: job.id,
      round: nextRound,
    }));
  }

  private async finish(
    job: ExamGenerationJob,
    status: 'COMPLETED' | 'FAILED' | 'CANCELED',
  ): Promise<void> {
    await this.prisma.examGenerationRequest.updateMany({
      where: { jobId: job.id, status: 'PENDING' },
      data: { status: 'FAILED', errorType: 'not_submitted' },
    });
    await this.setStatus(job.id, {
      status,
      completedAt: new Date(),
      currentBatchId: null,
      errorCode:
        status === 'FAILED'
          ? (job.errorCode ?? 'EXAM_GENERATION_NOTHING_KEPT')
          : job.errorCode,
    });
  }

  private async handleStepError(
    job: ExamGenerationJob,
    error: unknown,
  ): Promise<void> {
    const code = permanentErrorCode(error);
    this.logger.error(
      `Generation job #${job.id} step failed: ${(error as Error).message}`,
    );
    if (code) {
      await this.setStatus(job.id, {
        status: 'FAILED',
        errorCode: code.slice(0, 60),
        errorMessage: (error as Error).message.slice(0, 500),
        completedAt: new Date(),
      });
    }
  }

  private async setStatus(
    id: number,
    data: Prisma.ExamGenerationJobUpdateInput,
  ): Promise<void> {
    await this.prisma.examGenerationJob.update({ where: { id }, data });
  }
}

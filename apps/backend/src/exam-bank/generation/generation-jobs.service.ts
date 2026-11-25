import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ExamGenerationJob } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import {
  ACTIVE_JOB_STATUSES,
  QUESTION_TYPES,
  type GenerationMode,
  type QuestionDifficulty,
} from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import { ClaudeBatchClient } from './claude-batch.client';
import type { CreateGenerationJobDto } from './dto/create-generation-job.dto';
import { estimateGenerationCost } from './generation-cost';
import {
  toGenerationJobView,
  type GenerationEstimateView,
  type GenerationJobView,
} from './generation-job.view';
import {
  DEFAULT_TYPE_MIX,
  emptyMix,
  planGeneration,
  type PlannedRequest,
  type PlannerChunk,
} from './generation-planner';
import {
  GenerationPlanningService,
  type MaterialCoverageView,
} from './generation-planning.service';

type PreparedJob = {
  mode: GenerationMode;
  materialIds: number[];
  typeMix: TypeMix;
  requestedCount: number;
  plannedCount: number;
  maxPossible: number;
  isCapped: boolean;
  requests: Array<PlannedRequest & { difficulty?: QuestionDifficulty }>;
  chunks: PlannerChunk[];
};

const RECENT_JOBS = 30;

@Injectable()
export class GenerationJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ExamBankConfigService,
    private readonly planning: GenerationPlanningService,
    private readonly claude: ClaudeBatchClient,
  ) {}

  async estimate(dto: CreateGenerationJobDto): Promise<GenerationEstimateView> {
    const prepared = await this.prepare(dto);
    return {
      plannedCount: prepared.plannedCount,
      requestCount: prepared.requests.length,
      maxPossible: prepared.maxPossible,
      isCapped: prepared.isCapped,
      ...estimateGenerationCost(prepared, prepared.chunks, this.config.aiModel),
    };
  }

  async create(
    dto: CreateGenerationJobDto,
    userId: number,
  ): Promise<GenerationJobView> {
    if (!this.config.isAiConfigured)
      throw new ServiceUnavailableException('EXAM_AI_NOT_CONFIGURED');
    if (!this.config.isEmbeddingConfigured) {
      throw new ServiceUnavailableException('EXAM_EMBEDDING_NOT_CONFIGURED');
    }
    const active = await this.prisma.examGenerationJob.count({
      where: { status: { in: [...ACTIVE_JOB_STATUSES] } },
    });
    if (active > 0) throw new ConflictException('EXAM_GENERATION_JOB_ACTIVE');

    const prepared = await this.prepare(dto);
    if (!prepared.requests.length)
      throw new BadRequestException('EXAM_GENERATION_NOTHING_TO_PLAN');

    const job = await this.prisma.$transaction(async (tx) => {
      const created = await tx.examGenerationJob.create({
        data: {
          mode: prepared.mode,
          requestedCount: prepared.requestedCount,
          plannedCount: prepared.plannedCount,
          materialIds: prepared.materialIds,
          typeMix: prepared.typeMix,
          model: this.config.aiModel,
          effort: this.config.aiEffort,
          createdByUserId: userId,
        },
      });
      await tx.examGenerationRequest.createMany({
        data: prepared.requests.map((r) => ({
          ...r,
          jobId: created.id,
          round: 1,
        })),
      });
      return created;
    });
    return toGenerationJobView(job, 0);
  }

  /** What the bank still misses per material and difficulty. */
  coverage(): Promise<MaterialCoverageView[]> {
    return this.planning.coverage();
  }

  async list(): Promise<GenerationJobView[]> {
    const jobs = await this.prisma.examGenerationJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_JOBS,
    });
    return this.withDraftCounts(jobs);
  }

  async get(id: number): Promise<GenerationJobView> {
    const [view] = await this.withDraftCounts([await this.findOrThrow(id)]);
    return view;
  }

  async cancel(id: number): Promise<GenerationJobView> {
    const job = await this.findOrThrow(id);
    if (
      !ACTIVE_JOB_STATUSES.includes(job.status as never) ||
      job.status === 'CANCELING'
    ) {
      throw new ConflictException('EXAM_GENERATION_JOB_NOT_ACTIVE');
    }
    if (job.currentBatchId && job.status === 'BATCH_RUNNING') {
      await this.claude.cancel(job.currentBatchId);
    }
    const updated = await this.prisma.examGenerationJob.update({
      where: { id },
      data: { status: 'CANCELING' },
    });
    return toGenerationJobView(updated, 0);
  }

  private async prepare(dto: CreateGenerationJobDto): Promise<PreparedJob> {
    const materialIds = [...new Set(dto.materialIds)];
    const ready = await this.prisma.examKnowledgeMaterial.count({
      where: { id: { in: materialIds }, status: 'READY' },
    });
    if (ready !== materialIds.length)
      throw new BadRequestException('EXAM_MATERIALS_NOT_READY');
    return dto.mode === 'TARGET'
      ? this.prepareTargets(materialIds)
      : this.prepareCount(dto, materialIds);
  }

  private async prepareCount(
    dto: CreateGenerationJobDto,
    materialIds: number[],
  ): Promise<PreparedJob> {
    const count = dto.count ?? 0;
    if (count > this.config.maxQuestionsPerJob) {
      throw new BadRequestException('EXAM_GENERATION_COUNT_TOO_HIGH');
    }
    const typeMix = dto.typeMix
      ? {
          single: dto.typeMix.single,
          multiple: dto.typeMix.multiple,
          boolean: dto.typeMix.boolean,
        }
      : DEFAULT_TYPE_MIX;
    if (typeMix.single + typeMix.multiple + typeMix.boolean <= 0) {
      throw new BadRequestException('EXAM_TYPE_MIX_INVALID');
    }
    const chunks = await this.planning.loadPlannerChunks(materialIds);
    const plan = planGeneration(chunks, count, typeMix);
    return {
      mode: 'COUNT',
      materialIds,
      typeMix,
      requestedCount: count,
      plannedCount: plan.plannedCount,
      maxPossible: plan.maxPossible,
      isCapped: plan.isCapped,
      requests: plan.requests,
      chunks,
    };
  }

  /** Fills each material's per-difficulty targets; materials without targets are skipped. */
  private async prepareTargets(materialIds: number[]): Promise<PreparedJob> {
    const plan = await this.planning.planTargetGaps(materialIds);
    if (plan.missingCount > this.config.maxQuestionsPerJob) {
      throw new BadRequestException('EXAM_GENERATION_COUNT_TOO_HIGH');
    }
    const typeMix = emptyMix();
    for (const request of plan.requests)
      for (const type of QUESTION_TYPES) typeMix[type] += request.quota[type];
    const chunks = await this.planning.loadPlannerChunks(materialIds);
    return {
      mode: 'TARGET',
      materialIds,
      typeMix,
      requestedCount: plan.missingCount,
      plannedCount: plan.plannedCount,
      maxPossible: plan.plannedCount,
      isCapped: plan.plannedCount < plan.missingCount,
      requests: plan.requests,
      chunks,
    };
  }

  private async withDraftCounts(
    jobs: ExamGenerationJob[],
  ): Promise<GenerationJobView[]> {
    const counts = await this.prisma.examQuestion.groupBy({
      by: ['generationJobId'],
      where: {
        generationJobId: { in: jobs.map((j) => j.id) },
        status: 'DRAFT',
      },
      _count: { _all: true },
    });
    const drafts = new Map(
      counts.map((c) => [c.generationJobId, c._count._all]),
    );
    return jobs.map((job) => toGenerationJobView(job, drafts.get(job.id) ?? 0));
  }

  private async findOrThrow(id: number): Promise<ExamGenerationJob> {
    const job = await this.prisma.examGenerationJob.findUnique({
      where: { id },
    });
    if (!job) throw new NotFoundException('EXAM_GENERATION_JOB_NOT_FOUND');
    return job;
  }
}

import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GenerationJobsService } from './generation-jobs.service';
import { callArg, partial } from '../spec-helpers.testspec';

const NOW = new Date('2026-11-18T10:00:00Z');
const jobRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  status: 'PLANNED',
  requestedCount: 10,
  plannedCount: 12,
  materialIds: [3],
  typeMix: { single: 0.5, multiple: 0.25, boolean: 0.25 },
  model: 'claude-opus-5-5',
  round: 1,
  currentBatchId: null,
  createdAt: NOW,
  startedAt: null,
  completedAt: null,
  ...overrides,
});

function buildService(config: Record<string, unknown> = {}) {
  const tx = {
    examGenerationJob: { create: jest.fn().mockResolvedValue(jobRow()) },
    examGenerationRequest: { createMany: jest.fn() },
  };
  const prisma = {
    examGenerationJob: {
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest
        .fn()
        .mockResolvedValue(
          jobRow({ status: 'BATCH_RUNNING', currentBatchId: 'b1' }),
        ),
      update: jest.fn().mockResolvedValue(jobRow({ status: 'CANCELING' })),
    },
    examKnowledgeMaterial: { count: jest.fn().mockResolvedValue(1) },
    examQuestion: { groupBy: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const planning = {
    loadPlannerChunks: jest
      .fn()
      .mockResolvedValue([{ id: 1, tokenEstimate: 800, existingCount: 0 }]),
    plan: jest.fn().mockResolvedValue({
      plannedCount: 6,
      requests: [
        {
          chunkId: 1,
          quota: { single: 3, multiple: 2, boolean: 1 },
          variant: 0,
          variantCount: 1,
        },
      ],
    }),
  };
  const claude = { cancel: jest.fn().mockResolvedValue({}) };
  const fullConfig = {
    isAiConfigured: true,
    isEmbeddingConfigured: true,
    maxQuestionsPerJob: 1500,
    aiModel: 'claude-opus-5-5',
    aiEffort: 'medium',
    ...config,
  };
  const service = new GenerationJobsService(
    prisma as never,
    fullConfig as never,
    planning as never,
    claude as never,
  );
  return { service, prisma, tx, claude };
}

const DTO = { materialIds: [3, 3], count: 5 };

describe('GenerationJobsService', () => {
  it('estimates requests and cost at batch prices', async () => {
    const { service } = buildService();
    const estimate = await service.estimate(DTO);
    expect(estimate.plannedCount).toBe(6);
    expect(estimate.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('creates the job and its round-1 requests', async () => {
    const { service, tx } = buildService();
    const view = await service.create(DTO, 9);
    expect(tx.examGenerationJob.create).toHaveBeenCalledWith({
      data: partial({
        materialIds: [3],
        model: 'claude-opus-5-5',
        effort: 'medium',
        createdByUserId: 9,
      }),
    });
    expect(
      callArg<{ data: unknown[] }>(tx.examGenerationRequest.createMany).data[0],
    ).toEqual(expect.objectContaining({ jobId: 1, round: 1, chunkId: 1 }));
    expect(view.status).toBe('PLANNED');
  });

  it('refuses without API keys, while another job is active, or above the cap', async () => {
    await expect(
      buildService({ isAiConfigured: false }).service.create(DTO, 1),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    const busy = buildService();
    busy.prisma.examGenerationJob.count.mockResolvedValue(1);
    await expect(busy.service.create(DTO, 1)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(
      buildService({ maxQuestionsPerJob: 3 }).service.create(DTO, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects materials that are not READY', async () => {
    const { service, prisma } = buildService();
    prisma.examKnowledgeMaterial.count.mockResolvedValue(0);
    await expect(service.estimate(DTO)).rejects.toThrow(
      'EXAM_MATERIALS_NOT_READY',
    );
  });

  it('cancels the running batch', async () => {
    const { service, claude, prisma } = buildService();
    await service.cancel(1);
    expect(claude.cancel).toHaveBeenCalledWith('b1');
    expect(prisma.examGenerationJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'CANCELING' },
    });
  });
});

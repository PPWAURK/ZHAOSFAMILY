import {
  GenerationSubmitterService,
  buildCustomId,
} from './generation-submitter.service';
import { callArg } from '../spec-helpers.testspec';

const JOB = {
  id: 1,
  round: 1,
  startedAt: null,
  materialIds: [3],
  model: 'claude-opus-5-5',
  effort: 'medium',
};

function buildSubmitter(pending: Array<Record<string, unknown>>) {
  const prisma = {
    examGenerationRequest: {
      findMany: jest.fn().mockResolvedValue(pending),
      update: jest.fn((args: unknown) => args),
      updateMany: jest.fn((args: unknown) => args),
    },
    examGenerationJob: {
      update: jest.fn((args: unknown) => args),
      updateMany: jest.fn((args: unknown) => args),
    },
    examKnowledgeMaterial: {
      findMany: jest.fn().mockResolvedValue([{ id: 3, title: 'Hygiène' }]),
    },
    examCategory: { findMany: jest.fn().mockResolvedValue([]) },
    examQuestion: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ sourceChunkId: 5, promptZh: '旧题' }]),
    },
    $transaction: jest.fn().mockResolvedValue([{ count: 1 }]),
  };
  const retrieval = {
    loadIndex: jest.fn().mockResolvedValue([
      {
        id: 5,
        materialId: 3,
        ordinal: 0,
        content: '洗手至少20秒。',
        tokenEstimate: 500,
        vector: null,
      },
    ]),
  };
  const claude = {
    create: jest.fn().mockResolvedValue({ id: 'batch_9' }),
    cancel: jest.fn().mockResolvedValue({}),
  };
  const service = new GenerationSubmitterService(
    prisma as never,
    retrieval as never,
    claude as never,
  );
  return { service, prisma, claude };
}

const req = (id: number, chunkId: number) => ({
  id,
  jobId: 1,
  attempt: 1,
  chunkId,
  quota: { single: 1, multiple: 0, boolean: 0 },
  variant: 0,
  variantCount: 1,
});

describe('GenerationSubmitterService', () => {
  it('builds stable custom ids', () => {
    expect(buildCustomId({ jobId: 2, id: 30, attempt: 3 })).toBe('j2-r30-a3');
  });

  it('returns false when nothing is pending', async () => {
    const { service, claude } = buildSubmitter([]);
    await expect(service.submitRound(JOB as never)).resolves.toBe(false);
    expect(claude.create).not.toHaveBeenCalled();
  });

  it('submits one batch with RAG context and the exclusion list', async () => {
    const { service, prisma, claude } = buildSubmitter([
      req(10, 5),
      req(11, 99),
    ]);
    await expect(service.submitRound(JOB as never)).resolves.toBe(true);

    const requests = callArg<
      Array<{
        custom_id: string;
        params: { messages: Array<{ content: string }> };
      }>
    >(claude.create);
    expect(requests).toHaveLength(1);
    expect(requests[0].custom_id).toBe('j1-r10-a1');
    const prompt = requests[0].params.messages[0].content;
    expect(prompt).toContain('洗手至少20秒。');
    expect(prompt).toContain('- 旧题');
    expect(prisma.examGenerationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [11] } },
      data: { status: 'FAILED', errorType: 'chunk_missing' },
    });
    expect(prisma.examGenerationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [10] } },
      data: { status: 'SUBMITTED', batchId: 'batch_9' },
    });
  });

  it('keeps a job canceled during submission CANCELING and cancels its batch', async () => {
    const { service, prisma, claude } = buildSubmitter([req(10, 5)]);
    prisma.$transaction.mockResolvedValue([{ count: 0 }]);
    await service.submitRound(JOB as never);

    expect(prisma.examGenerationJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, status: { not: 'CANCELING' } },
      }),
    );
    expect(prisma.examGenerationJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { currentBatchId: 'batch_9' },
    });
    expect(claude.cancel).toHaveBeenCalledWith('batch_9');
  });
});

import { GenerationIngesterService } from './generation-ingester.service';
import { errored, singleQuestion, succeeded } from './batch-fixtures.testspec';
import { callArg } from '../spec-helpers.testspec';

function buildIngester(
  results: unknown[],
  requests: Array<Record<string, unknown>>,
  options: {
    materialCategoryId?: number | null;
    categories?: Array<{ id: number; code: string }>;
  } = {},
) {
  const chunk = {
    id: 5,
    materialId: 2,
    material: { categoryId: options.materialCategoryId ?? null },
  };
  const prisma = {
    examGenerationRequest: {
      findMany: jest.fn().mockResolvedValue(requests),
      update: jest.fn((args: unknown) => ({ op: 'request.update', args })),
      updateMany: jest.fn(),
    },
    examGenerationJob: {
      update: jest.fn((args: unknown) => ({ op: 'job.update', args })),
    },
    examQuestion: {
      createMany: jest.fn((args: unknown) => ({
        op: 'question.createMany',
        args,
      })),
    },
    examCategory: {
      findMany: jest.fn().mockResolvedValue(options.categories ?? []),
    },
    examKnowledgeChunk: {
      findMany: jest.fn().mockResolvedValue([chunk]),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const claude = {
    results: jest.fn(function* () {
      for (const r of results) yield r;
    }),
  };
  const dedup = {
    embeddingModel: 'voyage-4',
    loadContext: jest.fn().mockResolvedValue({ texts: new Set(), vectors: [] }),
    filter: jest.fn((items: unknown[]) =>
      Promise.resolve({
        kept: items.map((item) => ({ item, vector: null })),
        duplicateCount: 0,
      }),
    ),
  };
  const service = new GenerationIngesterService(
    prisma as never,
    claude as never,
    dedup as never,
  );
  return { service, prisma };
}

const JOB = { id: 1, currentBatchId: 'batch_1' } as never;
const request = (id: number, difficulty: string | null = null) => ({
  id,
  customId: `j1-r${id}-a1`,
  chunkId: 5,
  quota: { single: 1, multiple: 0, boolean: 0 },
  difficulty,
  status: 'SUBMITTED',
});

describe('GenerationIngesterService', () => {
  it('stores kept questions as AI drafts linked to chunk, material and job', async () => {
    const { service, prisma } = buildIngester(
      [succeeded('j1-r1-a1', [singleQuestion()])],
      [request(1)],
    );
    await service.ingest(JOB);

    const rows = callArg<{ data: unknown[] }>(
      prisma.examQuestion.createMany,
    ).data;
    expect(rows[0]).toEqual(
      expect.objectContaining({
        status: 'DRAFT',
        origin: 'AI',
        sourceChunkId: 5,
        sourceMaterialId: 2,
        generationJobId: 1,
        promptEmbedding: null,
        difficulty: 'recall',
        knowledgePoint: '洗手时长',
      }),
    );
    expect(prisma.examGenerationRequest.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'SUCCEEDED', producedCount: 1, keptCount: 1 },
    });
  });

  it("overrides the model's category with the material's own category", async () => {
    // Arrange
    const { service, prisma } = buildIngester(
      [
        succeeded('j1-r1-a1', [
          { ...singleQuestion(), categoryCode: 'hygiene' },
        ]),
      ],
      [request(1)],
      { materialCategoryId: 9, categories: [{ id: 3, code: 'hygiene' }] },
    );

    // Act
    await service.ingest(JOB);

    // Assert
    const rows = callArg<{ data: Array<{ categoryId: number | null }> }>(
      prisma.examQuestion.createMany,
    ).data;
    expect(rows[0].categoryId).toBe(9);
  });

  it("keeps the model's category when the material has none", async () => {
    const { service, prisma } = buildIngester(
      [
        succeeded('j1-r1-a1', [
          { ...singleQuestion(), categoryCode: 'hygiene' },
        ]),
      ],
      [request(1)],
      { materialCategoryId: null, categories: [{ id: 3, code: 'hygiene' }] },
    );
    await service.ingest(JOB);
    const rows = callArg<{ data: Array<{ categoryId: number | null }> }>(
      prisma.examQuestion.createMany,
    ).data;
    expect(rows[0].categoryId).toBe(3);
  });

  it("forces the request's difficulty onto the stored questions", async () => {
    const { service, prisma } = buildIngester(
      [succeeded('j1-r1-a1', [singleQuestion()])],
      [request(1, 'scenario')],
    );
    await service.ingest(JOB);
    const rows = callArg<{ data: Array<{ difficulty: string }> }>(
      prisma.examQuestion.createMany,
    ).data;
    expect(rows[0].difficulty).toBe('scenario');
  });

  it('marks retryable and failed requests and ignores unknown or repeated custom ids', async () => {
    const { service, prisma } = buildIngester(
      [
        errored('j1-r1-a1', 'overloaded_error'),
        errored('j1-r2-a1', 'invalid_request_error'),
        errored('j1-r1-a1', 'x'),
        errored('zzz', 'x'),
      ],
      [request(1), request(2)],
    );
    await service.ingest(JOB);

    const updates = prisma.examGenerationRequest.update.mock.calls.map(
      (c) => c[0],
    );
    expect(updates).toEqual([
      {
        where: { id: 1 },
        data: { status: 'RETRY', errorType: 'overloaded_error' },
      },
      {
        where: { id: 2 },
        data: { status: 'FAILED', errorType: 'invalid_request_error' },
      },
    ]);
  });

  it('retries requests the batch returned no result for', async () => {
    const { service, prisma } = buildIngester(
      [errored('j1-r1-a1', 'overloaded_error')],
      [request(1), request(2)],
    );
    await service.ingest(JOB);
    expect(prisma.examGenerationRequest.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [2] }, status: 'SUBMITTED' },
      data: { status: 'RETRY', errorType: 'missing_result' },
    });
  });

  it('does nothing when no request is still submitted', async () => {
    const { service, prisma } = buildIngester([], []);
    await service.ingest(JOB);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

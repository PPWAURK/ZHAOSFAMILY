import Anthropic from '@anthropic-ai/sdk';
import { GenerationBatchRunnerService } from './generation-batch-runner.service';
import { callArg, partial } from '../spec-helpers.testspec';

const baseJob = {
  id: 1,
  status: 'BATCH_RUNNING',
  round: 1,
  currentBatchId: 'batch_1',
  requestedCount: 10,
  keptCount: 10,
  materialIds: [3],
  typeMix: { single: 1, multiple: 0, boolean: 0 },
  errorCode: null,
};

function buildRunner(
  job: Record<string, unknown> = {},
  retries: unknown[] = [],
) {
  const current = { ...baseJob, ...job };
  const prisma = {
    examGenerationJob: {
      findMany: jest.fn().mockResolvedValue([current]),
      findUniqueOrThrow: jest.fn().mockResolvedValue(current),
      update: jest.fn((args: unknown) => args),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    examGenerationRequest: {
      findMany: jest.fn().mockResolvedValue(retries),
      createMany: jest.fn((args: unknown) => args),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const claude = {
    retrieve: jest.fn().mockResolvedValue({ processing_status: 'ended' }),
  };
  const submitter = { submitRound: jest.fn().mockResolvedValue(true) };
  const ingester = { ingest: jest.fn().mockResolvedValue(undefined) };
  const planning = { plan: jest.fn().mockResolvedValue({ requests: [] }) };
  const runner = new GenerationBatchRunnerService(
    prisma as never,
    claude as never,
    submitter as never,
    ingester as never,
    planning as never,
  );
  return {
    runner,
    prisma,
    claude,
    submitter,
    ingester,
    planning,
    job: current,
  };
}

type JobUpdate = { where: { id: number }; data: Record<string, unknown> };

const lastJobUpdate = (
  prisma: ReturnType<typeof buildRunner>['prisma'],
): JobUpdate =>
  callArg<JobUpdate>(
    prisma.examGenerationJob.update,
    prisma.examGenerationJob.update.mock.calls.length - 1,
  );

describe('GenerationBatchRunnerService', () => {
  it('submits planned jobs', async () => {
    const { runner, submitter, job } = buildRunner({ status: 'PLANNED' });
    await runner.step(job as never);
    expect(submitter.submitRound).toHaveBeenCalledWith(job);
  });

  it('waits while the batch is still processing', async () => {
    const { runner, claude, ingester, job } = buildRunner();
    claude.retrieve.mockResolvedValue({ processing_status: 'in_progress' });
    await runner.step(job as never);
    expect(ingester.ingest).not.toHaveBeenCalled();
  });

  it('ingests an ended batch and completes when the target is reached', async () => {
    const { runner, prisma, ingester, job } = buildRunner();
    await runner.step(job as never);
    expect(ingester.ingest).toHaveBeenCalled();
    expect(lastJobUpdate(prisma)).toEqual({
      where: { id: 1 },
      data: partial({
        status: 'COMPLETED',
        currentBatchId: null,
      }),
    });
  });

  it('plans a retry round, halving truncated requests, plus a top-up when short', async () => {
    const retry = {
      chunkId: 5,
      quota: { single: 4, multiple: 0, boolean: 0 },
      variant: 0,
      variantCount: 1,
      attempt: 1,
      errorType: 'max_tokens',
    };
    const { runner, prisma, planning, job } = buildRunner({ keptCount: 2 }, [
      retry,
    ]);
    planning.plan.mockResolvedValue({
      requests: [
        {
          chunkId: 6,
          quota: { single: 2, multiple: 0, boolean: 0 },
          variant: 0,
          variantCount: 1,
        },
      ],
    });
    await runner.step(job as never);

    const created = callArg<{ data: unknown[] }>(
      prisma.examGenerationRequest.createMany,
    ).data;
    expect(created).toHaveLength(3);
    expect(created[0]).toEqual(
      expect.objectContaining({
        round: 2,
        attempt: 2,
        quota: { single: 2, multiple: 0, boolean: 0 },
      }),
    );
    expect(planning.plan).toHaveBeenCalledWith([3], 4, {
      single: 1,
      multiple: 0,
      boolean: 0,
    });
    expect(prisma.examGenerationJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { round: 2, status: 'PLANNED', currentBatchId: null },
    });
  });

  it('stops after the last round', async () => {
    const { runner, prisma, job } = buildRunner({ round: 3, keptCount: 0 });
    await runner.step(job as never);
    expect(lastJobUpdate(prisma).data).toEqual(
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('finishes canceling jobs as CANCELED after ingesting', async () => {
    const { runner, prisma, ingester, job } = buildRunner({
      status: 'CANCELING',
    });
    await runner.step(job as never);
    expect(ingester.ingest).toHaveBeenCalled();
    expect(lastJobUpdate(prisma).data).toEqual(
      expect.objectContaining({ status: 'CANCELED' }),
    );
  });

  it('marks the job FAILED on permanent API errors but not on transient ones', async () => {
    const auth = buildRunner({ status: 'PLANNED' });
    auth.submitter.submitRound.mockRejectedValue(
      new Anthropic.AuthenticationError(
        401,
        undefined,
        'bad key',
        new Headers(),
      ),
    );
    await auth.runner.advanceActiveJobs();
    expect(lastJobUpdate(auth.prisma).data).toEqual(
      expect.objectContaining({
        status: 'FAILED',
        errorCode: 'EXAM_AI_UNAUTHORIZED',
      }),
    );

    const transient = buildRunner({ status: 'PLANNED' });
    transient.submitter.submitRound.mockRejectedValue(new Error('ECONNRESET'));
    await transient.runner.advanceActiveJobs();
    expect(transient.prisma.examGenerationJob.update).not.toHaveBeenCalled();
  });

  it('skips jobs locked by another worker', async () => {
    const { runner, prisma, submitter } = buildRunner({ status: 'PLANNED' });
    prisma.examGenerationJob.updateMany.mockResolvedValueOnce({ count: 0 });
    await runner.advanceActiveJobs();
    expect(submitter.submitRound).not.toHaveBeenCalled();
  });
});

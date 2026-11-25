import { ExamWorkerService } from './exam-worker.service';

function buildWorker() {
  const ingestion = { processNextPending: jest.fn().mockResolvedValue(false) };
  const generation = {
    advanceActiveJobs: jest.fn().mockRejectedValue(new Error('boom')),
  };
  const dedup = {
    backfillMissingEmbeddings: jest.fn().mockResolvedValue(false),
  };
  const expiry = { expireOverdue: jest.fn().mockResolvedValue(false) };
  const sessions = { closeExpired: jest.fn().mockResolvedValue(false) };
  const config = { isWorkerEnabled: false, workerIntervalMs: 1000 };
  const worker = new ExamWorkerService(
    config as never,
    ingestion as never,
    generation as never,
    dedup as never,
    expiry as never,
    sessions as never,
  );
  return { worker, ingestion, generation, dedup, expiry, sessions };
}

describe('ExamWorkerService', () => {
  it('runs every task once per tick and survives a failing task', async () => {
    const { worker, ingestion, dedup, expiry, sessions } = buildWorker();
    await worker.tick();
    expect(ingestion.processNextPending).toHaveBeenCalledTimes(1);
    expect(dedup.backfillMissingEmbeddings).toHaveBeenCalledTimes(1);
    expect(expiry.expireOverdue).toHaveBeenCalledTimes(1);
    expect(sessions.closeExpired).toHaveBeenCalledTimes(1);
  });

  it('skips overlapping ticks', async () => {
    const { worker, ingestion } = buildWorker();
    let release!: () => void;
    ingestion.processNextPending.mockReturnValue(
      new Promise<void>((resolve) => (release = resolve)),
    );
    const first = worker.tick();
    await worker.tick();
    release();
    await first;
    expect(ingestion.processNextPending).toHaveBeenCalledTimes(1);
  });

  it('does not start a timer when disabled', () => {
    const { worker } = buildWorker();
    const spy = jest.spyOn(global, 'setInterval');
    worker.onModuleInit();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

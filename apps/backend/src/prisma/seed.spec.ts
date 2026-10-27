// The seed module is CommonJS and intentionally has no generated TypeScript declaration.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { runSeed } = require('../../prisma/seed.js') as {
  runSeed: (
    seedOperation: () => Promise<void>,
    database: { $disconnect: () => Promise<void> },
    logger: { error: (...args: unknown[]) => void },
  ) => Promise<void>;
};

describe('runSeed', () => {
  afterEach(() => {
    process.exitCode = 0;
  });

  it('logs seed failures, sets a failing exit code, and disconnects', async () => {
    const error = new Error('seed query failed');
    const seedOperation = jest.fn().mockRejectedValue(error);
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const logger = { error: jest.fn() };

    await runSeed(seedOperation, { $disconnect: disconnect }, logger);

    expect(logger.error).toHaveBeenCalledWith('Database seed failed:', error);
    expect(process.exitCode).toBe(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects after a successful seed without changing the exit code', async () => {
    const seedOperation = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn().mockResolvedValue(undefined);
    const logger = { error: jest.fn() };

    await runSeed(seedOperation, { $disconnect: disconnect }, logger);

    expect(seedOperation).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
  });
});

import { TrafficService } from './traffic.service';

describe('TrafficService', () => {
  it('increments pageviews and new visitors in one transaction', async () => {
    type UpsertArgument = {
      where: { date: Date };
      create: { date: Date };
      update: Record<string, never>;
    };
    type UpdateArgument = {
      where: { date: Date };
      data: {
        pageviews: { increment: number };
        uniqueVisitors: { increment: number };
      };
    };

    let upsertArgument: UpsertArgument | undefined;
    let updateArgument: UpdateArgument | undefined;
    let executeRawCalls = 0;
    const transaction = {
      webTrafficDaily: {
        upsert: (argument: UpsertArgument): Promise<void> => {
          upsertArgument = argument;
          return Promise.resolve();
        },
        update: (argument: UpdateArgument): Promise<void> => {
          updateArgument = argument;
          return Promise.resolve();
        },
      },
      $executeRaw: (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ): Promise<number> => {
        void strings;
        void values;
        executeRawCalls += 1;
        return Promise.resolve(1);
      },
    };
    const service = new TrafficService({
      $transaction: async <Result>(
        callback: (client: typeof transaction) => Promise<Result>,
      ): Promise<Result> => callback(transaction),
    } as never);

    await service.recordWebPageview('2c5cda49-9b0b-4202-b3cb-d46c2e8052db');

    expect(upsertArgument?.create.date).toBeInstanceOf(Date);
    expect(executeRawCalls).toBe(1);
    expect(updateArgument?.data).toEqual({
      pageviews: { increment: 1 },
      uniqueVisitors: { increment: 1 },
    });
  });

  it('returns zeros before the first pageview of the day', async () => {
    const service = new TrafficService({
      webTrafficDaily: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(service.getTodayWebTraffic()).resolves.toMatchObject({
      period: '今日',
      pageviews: 0,
      visitors: 0,
    });
  });
});

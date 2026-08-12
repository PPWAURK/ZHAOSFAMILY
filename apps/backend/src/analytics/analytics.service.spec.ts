import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('aggregates monthly active users, daily users, and module usage', async () => {
    const prismaService = {
      appUsageEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 10,
            moduleName: 'dashboard',
            occurredAt: new Date('2026-08-02T08:00:00.000Z'),
          },
          {
            userId: 10,
            moduleName: 'orders',
            occurredAt: new Date('2026-08-02T12:00:00.000Z'),
          },
          {
            userId: 12,
            moduleName: 'dashboard',
            occurredAt: new Date('2026-08-03T08:00:00.000Z'),
          },
        ]),
      },
    };
    const service = new AnalyticsService(prismaService as never);

    const report = await service.getMonthlyUsageReport('2026-08');

    expect(report).toMatchObject({
      month: '2026-08',
      activeUsers: 2,
      moduleOpens: 3,
      dailyActiveUsers: [
        { date: '2026-08-02', users: 1 },
        { date: '2026-08-03', users: 1 },
      ],
      moduleUsage: [
        { moduleName: 'dashboard', opens: 2, uniqueUsers: 2 },
        { moduleName: 'orders', opens: 1, uniqueUsers: 1 },
      ],
    });
  });

  it('records module usage for the authenticated user', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const service = new AnalyticsService({
      appUsageEvent: { create },
    } as never);

    await service.recordMobileUsage({ id: 10 } as never, {
      moduleName: 'dashboard',
    });

    expect(create).toHaveBeenCalledWith({
      data: { userId: 10, moduleName: 'dashboard' },
    });
  });
});

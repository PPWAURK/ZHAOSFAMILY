import { PlatformReportService } from './platform-report.service';

describe('PlatformReportService', () => {
  it('reports every establishment and attributes activity and reads to their snapshots', async () => {
    const prismaService = {
      restaurant: {
        findMany: jest.fn().mockResolvedValue([
          { id: 2, storeCode: 2, name: 'Lyon' },
          { id: 3, storeCode: 3, name: 'Paris' },
          { id: 4, storeCode: 4, name: 'Lille' },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, name: 'Alice', restaurantId: 2 },
          { id: 12, name: 'Bob', restaurantId: 2 },
          { id: 11, name: 'Camille', restaurantId: 3 },
        ]),
      },
      appUsageEvent: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 10, restaurantId: 2, moduleName: 'dashboard' },
          { userId: 10, restaurantId: 2, moduleName: 'orders' },
          { userId: 11, restaurantId: 3, moduleName: 'dashboard' },
        ]),
      },
      dashboardPost: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 7,
            title: 'News',
            category: 'operations',
            createdAt: new Date('2026-10-10T08:00:00Z'),
          },
          {
            id: 8,
            title: 'No recipients',
            category: 'people',
            createdAt: new Date('2026-10-11T08:00:00Z'),
          },
        ]),
      },
      dashboardPostReadReceipt: {
        findMany: jest.fn().mockResolvedValue([
          {
            postId: 7,
            userId: 10,
            restaurantId: 2,
            readAt: new Date('2026-11-01T08:00:00Z'),
          },
          { postId: 7, userId: 12, restaurantId: 2, readAt: null },
          { postId: 7, userId: 11, restaurantId: 3, readAt: null },
        ]),
      },
    };
    const service = new PlatformReportService(prismaService as never);

    const report = await service.getMonthlyReport('2026-10');

    expect(prismaService.appUsageEvent.findMany).toHaveBeenCalledWith({
      where: {
        occurredAt: {
          gte: new Date('2026-09-30T22:00:00.000Z'),
          lt: new Date('2026-10-31T23:00:00.000Z'),
        },
      },
      select: { userId: true, restaurantId: true, moduleName: true },
    });
    expect(report.summary).toMatchObject({
      approvedUsers: 3,
      activeUsers: 2,
      moduleOpens: 3,
      expectedReads: 3,
      confirmedReads: 1,
      readRate: 33,
    });
    expect(report.stores[0]).toMatchObject({
      restaurantId: 2,
      activeUsers: 1,
      activityRate: 50,
      moduleOpens: 2,
      expectedReads: 2,
      confirmedReads: 1,
      readRate: 50,
      employeeUsage: [
        {
          userId: 10,
          employeeName: 'Alice',
          active: true,
          moduleOpens: 2,
          expectedReads: 1,
          confirmedReads: 1,
          readRate: 100,
        },
        {
          userId: 12,
          employeeName: 'Bob',
          active: false,
          moduleOpens: 0,
          expectedReads: 1,
          confirmedReads: 0,
          readRate: 0,
        },
      ],
    });
    expect(report.stores[2]).toMatchObject({
      restaurantId: 4,
      activeUsers: 0,
      activityRate: null,
      expectedReads: 0,
      readRate: null,
    });
    expect(
      report.newsByStore.find(
        (row) => row.postId === 8 && row.restaurantId === 2,
      ),
    ).toMatchObject({
      expectedReads: 0,
      readRate: null,
    });
  });

  it('returns no article rows when a month has no tracked publications', async () => {
    const service = new PlatformReportService({
      restaurant: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      appUsageEvent: { findMany: jest.fn().mockResolvedValue([]) },
      dashboardPost: { findMany: jest.fn().mockResolvedValue([]) },
      dashboardPostReadReceipt: { findMany: jest.fn() },
    } as never);

    const report = await service.getMonthlyReport('2026-10');
    expect(report.newsByStore).toEqual([]);
    expect(report.summary.readRate).toBeNull();
  });
});

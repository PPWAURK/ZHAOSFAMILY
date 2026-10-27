import { Injectable } from '@nestjs/common';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { PrismaService } from '../prisma/prisma.service';
import type { PlatformMonthlyReport } from './analytics.types';
import { buildPlatformMonthlyReport } from './platform-report-aggregation';
import { createPlatformMonthRange } from './platform-month-range';

@Injectable()
export class PlatformReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMonthlyReport(month?: string): Promise<PlatformMonthlyReport> {
    const range = createPlatformMonthRange(month);
    const [restaurants, approvedUsers, events, posts] = await Promise.all([
      this.prismaService.restaurant.findMany({
        select: { id: true, storeCode: true, name: true },
        orderBy: { storeCode: 'asc' },
      }),
      this.prismaService.user.findMany({
        where: { accountStatus: ACCOUNT_STATUS.approved },
        select: { id: true, name: true, restaurantId: true },
      }),
      this.prismaService.appUsageEvent.findMany({
        where: { occurredAt: { gte: range.startsAt, lt: range.endsAt } },
        select: { userId: true, restaurantId: true, moduleName: true },
      }),
      this.prismaService.dashboardPost.findMany({
        where: {
          createdAt: { gte: range.startsAt, lt: range.endsAt },
          readTrackingStartedAt: { not: null },
        },
        select: { id: true, title: true, category: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const receipts = posts.length
      ? await this.prismaService.dashboardPostReadReceipt.findMany({
          where: { postId: { in: posts.map((post) => post.id) } },
          select: {
            postId: true,
            userId: true,
            restaurantId: true,
            readAt: true,
          },
        })
      : [];

    return buildPlatformMonthlyReport(range, {
      restaurants,
      approvedUsers,
      events,
      posts,
      receipts,
    });
  }
}

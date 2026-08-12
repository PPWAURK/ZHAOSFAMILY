import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TodayWebTraffic } from './traffic.types';

@Injectable()
export class TrafficService {
  constructor(private readonly prismaService: PrismaService) {}

  async recordWebPageview(visitorId: string): Promise<void> {
    const date = startOfUtcDay(new Date());
    const visitorHash = hashDailyVisitorId(visitorId, date);

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.webTrafficDaily.upsert({
        where: { date },
        create: { date },
        update: {},
      });

      const createdVisitor = await transaction.$executeRaw`
        INSERT IGNORE INTO web_traffic_daily_visitors (date, visitor_hash)
        VALUES (${date}, ${visitorHash})
      `;

      await transaction.webTrafficDaily.update({
        where: { date },
        data: {
          pageviews: { increment: 1 },
          uniqueVisitors: { increment: createdVisitor },
        },
      });
    });
  }

  async getTodayWebTraffic(): Promise<TodayWebTraffic> {
    const date = startOfUtcDay(new Date());
    const traffic = await this.prismaService.webTrafficDaily.findUnique({
      where: { date },
      select: {
        pageviews: true,
        uniqueVisitors: true,
      },
    });

    return {
      date: date.toISOString().slice(0, 10),
      period: '今日',
      pageviews: traffic?.pageviews ?? 0,
      visitors: traffic?.uniqueVisitors ?? 0,
    };
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function hashDailyVisitorId(visitorId: string, date: Date): string {
  return createHash('sha256')
    .update(`${date.toISOString()}:${visitorId}`)
    .digest('hex');
}

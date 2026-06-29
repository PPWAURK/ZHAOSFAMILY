import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateScreenSecurityEventDto } from './dto/create-screenshot-event.dto';
import type { ListScreenSecurityEventsQueryDto } from './dto/list-screen-security-events-query.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export type ScreenSecurityEventItem = {
  id: number;
  userId: number;
  userName: string;
  eventType: string;
  screenName: string | null;
  deviceInfo: Record<string, unknown> | null;
  createdAt: string;
};

export type PaginatedScreenSecurityEvents = {
  items: ScreenSecurityEventItem[];
  page: number;
  pageSize: number;
  total: number;
};

@Injectable()
export class ScreenSecurityEventService {
  constructor(private readonly prismaService: PrismaService) {}

  async record(
    userId: number,
    dto: CreateScreenSecurityEventDto,
  ): Promise<void> {
    await this.prismaService.screenSecurityEvent.create({
      data: {
        userId,
        eventType: dto.eventType ?? 'screenshot',
        screenName: dto.screenName ?? null,
        deviceInfo: dto.deviceInfo
          ? (dto.deviceInfo as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async list(
    query: ListScreenSecurityEventsQueryDto,
  ): Promise<PaginatedScreenSecurityEvents> {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const pageSize = Math.min(
      query.pageSize && query.pageSize > 0
        ? query.pageSize
        : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const where = this.buildWhere(query);

    const [records, total] = await Promise.all([
      this.prismaService.screenSecurityEvent.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.screenSecurityEvent.count({ where }),
    ]);

    return {
      items: records.map((record) => ({
        id: record.id,
        userId: record.userId,
        userName: record.user.name ?? record.user.email,
        eventType: record.eventType,
        screenName: record.screenName,
        deviceInfo: record.deviceInfo as Record<string, unknown> | null,
        createdAt: record.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async deleteMany(ids: number[]): Promise<number> {
    const result = await this.prismaService.screenSecurityEvent.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }

  private buildWhere(
    query: ListScreenSecurityEventsQueryDto,
  ): Prisma.ScreenSecurityEventWhereInput {
    const where: Prisma.ScreenSecurityEventWhereInput = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};

      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }

      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    return where;
  }
}

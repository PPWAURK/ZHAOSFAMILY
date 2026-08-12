import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RecordMobileUsageDto } from './dto/record-mobile-usage.dto';
import type {
  DailyActiveUsers,
  MobileUsageModule,
  ModuleUsage,
  MonthlyUsageReport,
} from './analytics.types';

type MonthRange = {
  month: string;
  startsAt: Date;
  endsAt: Date;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async recordMobileUsage(
    user: AuthUser,
    dto: RecordMobileUsageDto,
  ): Promise<void> {
    await this.prismaService.appUsageEvent.create({
      data: {
        userId: user.id,
        moduleName: dto.moduleName,
      },
    });
  }

  async getMonthlyUsageReport(month?: string): Promise<MonthlyUsageReport> {
    const range = createMonthRange(month);
    const events = await this.prismaService.appUsageEvent.findMany({
      where: {
        occurredAt: {
          gte: range.startsAt,
          lt: range.endsAt,
        },
      },
      select: {
        userId: true,
        moduleName: true,
        occurredAt: true,
      },
      orderBy: {
        occurredAt: 'asc',
      },
    });

    const dailyUsers = new Map<string, Set<number>>();
    const modules = new Map<
      MobileUsageModule,
      { opens: number; users: Set<number> }
    >();
    const activeUsers = new Set<number>();

    for (const event of events) {
      activeUsers.add(event.userId);
      addDailyUser(dailyUsers, event.occurredAt, event.userId);
      addModuleUsage(
        modules,
        event.moduleName as MobileUsageModule,
        event.userId,
      );
    }

    return {
      month: range.month,
      startsAt: range.startsAt.toISOString(),
      endsAt: range.endsAt.toISOString(),
      activeUsers: activeUsers.size,
      moduleOpens: events.length,
      dailyActiveUsers: formatDailyUsers(dailyUsers),
      moduleUsage: formatModuleUsage(modules),
    };
  }
}

function createMonthRange(month?: string): MonthRange {
  const [year, monthNumber] = (month ?? currentMonth()).split('-').map(Number);
  const startsAt = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endsAt = new Date(Date.UTC(year, monthNumber, 1));

  return {
    month: `${year}-${String(monthNumber).padStart(2, '0')}`,
    startsAt,
    endsAt,
  };
}

function currentMonth(): string {
  const now = new Date();

  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function addDailyUser(
  dailyUsers: Map<string, Set<number>>,
  occurredAt: Date,
  userId: number,
): void {
  const date = occurredAt.toISOString().slice(0, 10);
  const users = dailyUsers.get(date) ?? new Set<number>();
  users.add(userId);
  dailyUsers.set(date, users);
}

function addModuleUsage(
  modules: Map<MobileUsageModule, { opens: number; users: Set<number> }>,
  moduleName: MobileUsageModule,
  userId: number,
): void {
  const usage = modules.get(moduleName) ?? {
    opens: 0,
    users: new Set<number>(),
  };
  usage.opens += 1;
  usage.users.add(userId);
  modules.set(moduleName, usage);
}

function formatDailyUsers(
  dailyUsers: Map<string, Set<number>>,
): DailyActiveUsers[] {
  return [...dailyUsers.entries()].map(([date, users]) => ({
    date,
    users: users.size,
  }));
}

function formatModuleUsage(
  modules: Map<MobileUsageModule, { opens: number; users: Set<number> }>,
): ModuleUsage[] {
  return [...modules.entries()]
    .map(([moduleName, usage]) => ({
      moduleName,
      opens: usage.opens,
      uniqueUsers: usage.users.size,
    }))
    .sort(
      (left, right) =>
        right.opens - left.opens ||
        left.moduleName.localeCompare(right.moduleName),
    );
}

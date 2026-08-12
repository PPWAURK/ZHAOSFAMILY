import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MonitorAnalyticsTokenGuard } from '../auth/guards/monitor-analytics-token.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { AnalyticsService } from './analytics.service';
import { MonthlyUsageQueryDto } from './dto/monthly-usage-query.dto';
import { RecordMobileUsageDto } from './dto/record-mobile-usage.dto';
import type { MonthlyUsageReport } from './analytics.types';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('mobile/events')
  async recordMobileUsage(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RecordMobileUsageDto,
  ): Promise<{ message: 'MOBILE_USAGE_RECORDED' }> {
    await this.analyticsService.recordMobileUsage(request.user!, dto);

    return { message: 'MOBILE_USAGE_RECORDED' };
  }

  @Get('monthly')
  @Public()
  @UseGuards(MonitorAnalyticsTokenGuard)
  getMonthlyUsageReport(
    @Query() query: MonthlyUsageQueryDto,
  ): Promise<MonthlyUsageReport> {
    return this.analyticsService.getMonthlyUsageReport(query.month);
  }

  @Get('monthly/export.csv')
  @Public()
  @UseGuards(MonitorAnalyticsTokenGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  getMonthlyUsageCsv(@Query() query: MonthlyUsageQueryDto): Promise<string> {
    return this.analyticsService
      .getMonthlyUsageReport(query.month)
      .then((report) => formatMonthlyUsageCsv(report));
  }
}

function formatMonthlyUsageCsv(report: MonthlyUsageReport): string {
  const rows = [
    ['month', report.month],
    ['active_users', String(report.activeUsers)],
    ['module_opens', String(report.moduleOpens)],
    [],
    ['date', 'daily_active_users'],
    ...report.dailyActiveUsers.map((entry) => [
      entry.date,
      String(entry.users),
    ]),
    [],
    ['module', 'opens', 'unique_users'],
    ...report.moduleUsage.map((entry) => [
      entry.moduleName,
      String(entry.opens),
      String(entry.uniqueUsers),
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}\n`;
}

function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

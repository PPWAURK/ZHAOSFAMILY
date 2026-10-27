import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { HoldingAnalyticsGuard } from './guards/holding-analytics.guard';
import { PlatformReportService } from './platform-report.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PlatformReportService, HoldingAnalyticsGuard],
})
export class AnalyticsModule {}

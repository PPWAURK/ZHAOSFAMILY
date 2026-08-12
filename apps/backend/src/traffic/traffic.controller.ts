import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { MonitorAnalyticsTokenGuard } from '../auth/guards/monitor-analytics-token.guard';
import { RecordWebPageviewDto } from './dto/record-web-pageview.dto';
import { TrafficService } from './traffic.service';
import type { TodayWebTraffic } from './traffic.types';

@Controller('traffic')
export class TrafficController {
  constructor(private readonly trafficService: TrafficService) {}

  @Public()
  @Post('pageviews')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async recordWebPageview(
    @Body() dto: RecordWebPageviewDto,
  ): Promise<{ message: 'WEB_PAGEVIEW_RECORDED' }> {
    await this.trafficService.recordWebPageview(dto.visitorId);

    return { message: 'WEB_PAGEVIEW_RECORDED' };
  }

  @Public()
  @Get('today')
  @UseGuards(MonitorAnalyticsTokenGuard)
  getTodayWebTraffic(): Promise<TodayWebTraffic> {
    return this.trafficService.getTodayWebTraffic();
  }
}

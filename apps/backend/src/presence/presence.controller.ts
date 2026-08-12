import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { MonitorAnalyticsTokenGuard } from '../auth/guards/monitor-analytics-token.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { PresenceService } from './presence.service';
import type { MobilePresenceSummary } from './presence.types';

@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceService: PresenceService) {}

  @Post('mobile/heartbeat')
  async recordMobileHeartbeat(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ message: 'PRESENCE_RECORDED' }> {
    await this.presenceService.recordMobileHeartbeat(request.user!);

    return { message: 'PRESENCE_RECORDED' };
  }

  @Get('mobile/summary')
  @Public()
  @UseGuards(MonitorAnalyticsTokenGuard)
  getMobilePresenceSummary(): Promise<MobilePresenceSummary> {
    return this.presenceService.getMobilePresenceSummary();
  }
}

import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { RequirePermissions, SYSTEM_PERMISSIONS } from '../auth/permissions';
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
  @UseGuards(PermissionGuard)
  @RequirePermissions(SYSTEM_PERMISSIONS.viewAnalytics)
  getMobilePresenceSummary(): Promise<MobilePresenceSummary> {
    return this.presenceService.getMobilePresenceSummary();
  }
}

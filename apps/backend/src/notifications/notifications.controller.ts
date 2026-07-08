import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { NotificationsService } from './notifications.service';
import type { NotificationListResult } from './notifications.types';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<NotificationListResult> {
    const userId = await this.resolveUserId(authorization);

    return this.notificationsService.listForUser(userId, query);
  }

  @Get('unread-count')
  async unreadCount(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<{ unreadCount: number }> {
    const userId = await this.resolveUserId(authorization);

    return { unreadCount: await this.notificationsService.countUnread(userId) };
  }

  @Post(':id/read')
  async markRead(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ unreadCount: number }> {
    const userId = await this.resolveUserId(authorization);

    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  async markAllRead(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<{ unreadCount: number }> {
    const userId = await this.resolveUserId(authorization);

    return this.notificationsService.markAllRead(userId);
  }

  @Post('push-tokens')
  @HttpCode(204)
  async register(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    const userId = await this.resolveUserId(authorization);
    await this.notificationsService.registerToken(userId, dto);
  }

  @Delete('push-tokens')
  @HttpCode(204)
  async unregister(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UnregisterPushTokenDto,
  ): Promise<void> {
    const userId = await this.resolveUserId(authorization);
    await this.notificationsService.unregisterToken(userId, dto.token);
  }

  private async resolveUserId(
    authorization: string | undefined,
  ): Promise<number> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return user.id;
  }
}

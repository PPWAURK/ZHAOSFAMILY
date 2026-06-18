import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UnregisterPushTokenDto } from './dto/unregister-push-token.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications/push-tokens')
export class NotificationsController {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @HttpCode(204)
  async register(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<void> {
    const userId = await this.resolveUserId(authorization);
    await this.notificationsService.registerToken(userId, dto);
  }

  @Delete()
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

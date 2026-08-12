import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { parseBearerToken } from '../auth-token.utils';
import type { AuthenticatedRequest } from '../authenticated-request';

@Injectable()
export class MonitorAnalyticsTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const configuredToken = this.configService
      .get<string>('MONITOR_ANALYTICS_TOKEN')
      ?.trim();
    const presentedToken = parseBearerToken(request.headers.authorization);

    if (!configuredToken || !presentedToken) {
      throw new UnauthorizedException('MONITOR_ANALYTICS_TOKEN_INVALID');
    }

    const configuredBuffer = Buffer.from(configuredToken);
    const presentedBuffer = Buffer.from(presentedToken);

    if (
      configuredBuffer.length !== presentedBuffer.length ||
      !timingSafeEqual(configuredBuffer, presentedBuffer)
    ) {
      throw new UnauthorizedException('MONITOR_ANALYTICS_TOKEN_INVALID');
    }

    return true;
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthService } from '../auth.service';
import { parseBearerToken } from '../auth-token.utils';

/**
 * Global authentication guard. Validates the Bearer access token on every
 * request unless the route/controller is decorated with @Public().
 *
 * Registered via APP_GUARD in AuthModule.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = parseBearerToken(request.headers.authorization);

    if (!accessToken) {
      throw new UnauthorizedException('ACCESS_TOKEN_REQUIRED');
    }

    // getCurrentUser validates the token signature/expiry, checks the user
    // still exists, and verifies the account status is approved. Any failure
    // throws UnauthorizedException, blocking the request before the controller.
    await this.authService.getCurrentUser(accessToken);

    return true;
  }
}

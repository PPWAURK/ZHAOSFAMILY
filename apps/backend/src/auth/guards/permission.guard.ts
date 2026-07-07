import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { parseBearerToken } from '../auth-token.utils';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const anyRequiredPermissions =
      this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0 && anyRequiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userPermissions = await this.authService.getPermissionsForToken(
      parseBearerToken(request.headers.authorization),
    );
    const grantedPermissions = new Set(userPermissions);
    const hasAllPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );
    const hasAnyPermission =
      anyRequiredPermissions.length === 0 ||
      anyRequiredPermissions.some((permission) => grantedPermissions.has(permission));

    if (!hasAllPermissions || !hasAnyPermission) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    return true;
  }
}

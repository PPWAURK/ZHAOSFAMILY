import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';

@Injectable()
export class HoldingAnalyticsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const jobRoles = (request.user?.jobRole ?? '')
      .split(',')
      .map((role) => role.trim().toLowerCase());

    if (!jobRoles.includes('holding')) {
      throw new ForbiddenException('PLATFORM_REPORT_FORBIDDEN');
    }

    return true;
  }
}

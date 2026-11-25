import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.service';
import { EXAM_PERMISSIONS } from '../../auth/permissions';

/** Question-bank admins act on every session, examiners only on their own. */
export const canSeeAllSessions = (user: AuthUser): boolean =>
  user.permissions.includes(EXAM_PERMISSIONS.manageBank);

export function assertCanManageSession(
  user: AuthUser,
  session: { examinerUserId: number },
): void {
  if (session.examinerUserId !== user.id && !canSeeAllSessions(user)) {
    throw new ForbiddenException('EXAM_SESSION_FORBIDDEN');
  }
}

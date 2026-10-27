import { ForbiddenException } from '@nestjs/common';
import { HoldingAnalyticsGuard } from './holding-analytics.guard';

function contextFor(jobRole: string | null) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { jobRole } }) }),
  } as never;
}

describe('HoldingAnalyticsGuard', () => {
  const guard = new HoldingAnalyticsGuard();

  it('accepts holding among multiple roles', () => {
    expect(guard.canActivate(contextFor('regional-manager, holding'))).toBe(
      true,
    );
  });

  it('rejects non-holding roles', () => {
    expect(() => guard.canActivate(contextFor('store-manager'))).toThrow(
      ForbiddenException,
    );
  });
});

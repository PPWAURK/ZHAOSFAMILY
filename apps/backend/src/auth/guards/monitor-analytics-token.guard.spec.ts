import { UnauthorizedException } from '@nestjs/common';
import { MonitorAnalyticsTokenGuard } from './monitor-analytics-token.guard';

function createExecutionContext(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  };
}

describe('MonitorAnalyticsTokenGuard', () => {
  it('allows the configured bearer token', () => {
    const guard = new MonitorAnalyticsTokenGuard({
      get: jest.fn().mockReturnValue('monitor-token'),
    } as never);

    expect(
      guard.canActivate(
        createExecutionContext('Bearer monitor-token') as never,
      ),
    ).toBe(true);
  });

  it('rejects a missing or incorrect bearer token', () => {
    const guard = new MonitorAnalyticsTokenGuard({
      get: jest.fn().mockReturnValue('monitor-token'),
    } as never);

    expect(() => guard.canActivate(createExecutionContext() as never)).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(createExecutionContext('Bearer incorrect') as never),
    ).toThrow(UnauthorizedException);
  });
});

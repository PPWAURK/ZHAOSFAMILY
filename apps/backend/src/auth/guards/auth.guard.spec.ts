import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function createContext(request: unknown, isPublic: boolean | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === IS_PUBLIC_KEY ? isPublic : undefined,
    ),
  } as unknown as Reflector;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { reflector, context };
}

describe('AuthGuard', () => {
  function createAuthService() {
    return {
      getCurrentUser: jest.fn(),
    };
  }

  it('bypasses resolution for @Public routes', async () => {
    const authService = createAuthService();
    const { reflector, context } = createContext({ headers: {} }, true);
    const guard = new AuthGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('rejects a request without a bearer token', async () => {
    const authService = createAuthService();
    const { reflector, context } = createContext({ headers: {} }, false);
    const guard = new AuthGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
  });

  it('attaches the resolved user (with permissions) to the request', async () => {
    const authService = createAuthService();
    const resolvedUser = { id: 7, permissions: ['training.material.read'] };
    authService.getCurrentUser.mockResolvedValue(resolvedUser);
    const request: { headers: { authorization: string }; user?: unknown } = {
      headers: { authorization: 'Bearer token' },
    };
    const { reflector, context } = createContext(request, false);
    const guard = new AuthGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getCurrentUser).toHaveBeenCalledWith('token');
    expect(request.user).toBe(resolvedUser);
  });
});

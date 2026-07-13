import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../permissions';

type Meta = Record<string, string[] | undefined>;

function createContext(request: unknown, meta: Meta) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => meta[key]),
  } as unknown as Reflector;

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  return { reflector, context };
}

describe('PermissionGuard', () => {
  function createAuthService() {
    return {
      getPermissionsForToken: jest.fn<
        Promise<string[]>,
        [string | undefined]
      >(),
    };
  }

  it('allows the route when no permissions are required and never touches the DB', async () => {
    const authService = createAuthService();
    const { reflector, context } = createContext({ user: undefined }, {});
    const guard = new PermissionGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getPermissionsForToken).not.toHaveBeenCalled();
  });

  it('reads permissions from request.user without re-querying (dedup)', async () => {
    const authService = createAuthService();
    const request = {
      user: { permissions: ['training.material.create'] },
      headers: { authorization: 'Bearer token' },
    };
    const { reflector, context } = createContext(request, {
      [PERMISSIONS_KEY]: ['training.material.create'],
    });
    const guard = new PermissionGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    // The whole point of the P0 fix: the redundant permission query is gone.
    expect(authService.getPermissionsForToken).not.toHaveBeenCalled();
  });

  it('throws when request.user lacks a required permission', async () => {
    const authService = createAuthService();
    const request = {
      user: { permissions: ['training.material.read'] },
      headers: { authorization: 'Bearer token' },
    };
    const { reflector, context } = createContext(request, {
      [PERMISSIONS_KEY]: ['training.material.create'],
    });
    const guard = new PermissionGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(authService.getPermissionsForToken).not.toHaveBeenCalled();
  });

  it('falls back to the token when request.user is absent (e.g. @Public route)', async () => {
    const authService = createAuthService();
    authService.getPermissionsForToken.mockResolvedValue([
      'training.material.create',
    ]);
    const request = { headers: { authorization: 'Bearer token' } };
    const { reflector, context } = createContext(request, {
      [ANY_PERMISSIONS_KEY]: ['training.material.create'],
    });
    const guard = new PermissionGuard(reflector, authService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.getPermissionsForToken).toHaveBeenCalledWith('token');
  });
});

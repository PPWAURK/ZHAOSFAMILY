import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  function createService() {
    const userRole = {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    };
    const prismaService = {
      role: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      userRole,
      $transaction: jest.fn(
        (callback: (tx: { userRole: typeof userRole }) => unknown) =>
          Promise.resolve(callback({ userRole })),
      ),
    };

    return {
      prismaService,
      service: new PermissionsService(prismaService as never),
    };
  }

  it('lists built-in roles with permission summaries', async () => {
    const { service, prismaService } = createService();
    prismaService.role.findMany.mockResolvedValue([
      {
        id: 3,
        name: 'training-admin',
        description: 'Training admin',
        rolePermissions: [
          { permission: { key: 'training.material.update' } },
          { permission: { key: 'training.material.create' } },
        ],
      },
      {
        id: 1,
        name: 'super-admin',
        description: 'Super admin',
        rolePermissions: [{ permission: { key: 'system.permission.manage' } }],
      },
    ]);

    await expect(service.listRoles()).resolves.toEqual([
      {
        name: 'super-admin',
        description: 'Super admin',
        permissions: ['system.permission.manage'],
      },
      {
        name: 'training-admin',
        description: 'Training admin',
        permissions: ['training.material.create', 'training.material.update'],
      },
    ]);
  });

  it('lists users with roles and aggregated permissions', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Zhao Admin',
        email: 'admin@zhao.test',
        jobRole: 'store-manager',
        restaurant: {
          id: 7,
          name: 'ZHAO Test',
        },
        userRoles: [
          {
            role: {
              name: 'training-admin',
              rolePermissions: [
                { permission: { key: 'training.material.create' } },
              ],
            },
          },
          {
            role: {
              name: 'super-admin',
              rolePermissions: [
                { permission: { key: 'system.permission.manage' } },
              ],
            },
          },
        ],
      },
    ]);

    await expect(service.listUsers()).resolves.toEqual([
      {
        id: 1,
        name: 'Zhao Admin',
        email: 'admin@zhao.test',
        jobRole: 'store-manager',
        restaurant: {
          id: 7,
          name: 'ZHAO Test',
        },
        roles: ['super-admin', 'training-admin'],
        permissions: ['system.permission.manage', 'training.material.create'],
      },
    ]);
  });

  it('replaces all RBAC roles for a user', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({
        id: 1,
        name: 'Zhao Viewer',
        email: 'viewer@zhao.test',
        jobRole: 'front-of-house',
        restaurant: {
          id: 7,
          name: 'ZHAO Test',
        },
        userRoles: [
          {
            role: {
              name: 'training-viewer',
              rolePermissions: [
                { permission: { key: 'training.material.read' } },
              ],
            },
          },
          {
            role: {
              name: 'store-manager',
              rolePermissions: [
                { permission: { key: 'training.material.play' } },
              ],
            },
          },
        ],
      });
    prismaService.role.findMany.mockResolvedValue([
      { id: 11, name: 'store-manager' },
      { id: 12, name: 'training-viewer' },
    ]);
    prismaService.userRole.deleteMany.mockResolvedValue({ count: 1 });
    prismaService.userRole.createMany.mockResolvedValue({ count: 2 });

    await expect(
      service.updateUserRoles(1, ['store-manager', 'training-viewer']),
    ).resolves.toMatchObject({
      id: 1,
      roles: ['store-manager', 'training-viewer'],
      jobRole: 'front-of-house',
    });
    expect(prismaService.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(prismaService.userRole.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 1, roleId: 11 },
        { userId: 1, roleId: 12 },
      ],
    });
  });

  it('rejects unknown roles before writing changes', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({ id: 1 });
    prismaService.role.findMany.mockResolvedValue([
      { id: 12, name: 'training-viewer' },
    ]);

    await expect(
      service.updateUserRoles(1, ['training-viewer', 'missing-role']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('throws when updating roles for a missing user', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUserRoles(404, ['training-viewer']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  function createService() {
    const userRole = {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    };
    const role = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    };
    const user = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const legacyUserManagedRestaurant = {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    };
    const refreshSession = {
      deleteMany: jest.fn(),
    };
    const prismaService = {
      legacyUserManagedRestaurant,
      refreshSession,
      restaurant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      role,
      user,
      userRole,
      $transaction: jest.fn(
        (
          callback: (tx: {
            role: typeof role;
            user: typeof user;
            userRole: typeof userRole;
            legacyUserManagedRestaurant: typeof legacyUserManagedRestaurant;
            refreshSession: typeof refreshSession;
          }) => unknown,
        ) =>
          Promise.resolve(
            callback({
              legacyUserManagedRestaurant,
              refreshSession,
              role,
              user,
              userRole,
            }),
          ),
      ),
    };
    legacyUserManagedRestaurant.findMany.mockResolvedValue([]);
    prismaService.restaurant.findMany.mockResolvedValue([]);

    const notificationsService = {
      sendToUsers: jest.fn().mockResolvedValue(undefined),
      registerToken: jest.fn(),
      unregisterToken: jest.fn(),
    };

    const authService = {
      invalidateUserPermissions: jest.fn(),
    };

    return {
      prismaService,
      notificationsService,
      authService,
      service: new PermissionsService(
        prismaService as never,
        notificationsService as never,
        authService as never,
      ),
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
        accountStatus: 'approved',
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
        accountStatus: 'approved',
        jobRole: 'store-manager',
        restaurant: {
          id: 7,
          name: 'ZHAO Test',
        },
        managedRestaurants: [],
        roles: ['super-admin', 'training-admin'],
        permissions: ['system.permission.manage', 'training.material.create'],
      },
    ]);
  });

  it('replaces all RBAC roles for a user', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({ id: 1, jobRole: 'front-of-house' })
      .mockResolvedValueOnce({
        id: 1,
        name: 'Zhao Viewer',
        email: 'viewer@zhao.test',
        accountStatus: 'approved',
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
    prismaService.user.findUnique.mockResolvedValue({
      id: 1,
      jobRole: 'front-of-house',
    });
    prismaService.role.findMany.mockResolvedValue([
      { id: 12, name: 'training-viewer' },
    ]);

    await expect(
      service.updateUserRoles(1, ['training-viewer', 'missing-role']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects super admin assignment for non-holding users', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 1,
      jobRole: 'store-manager',
    });

    await expect(
      service.updateUserRoles(1, ['super-admin']),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.role.findMany).not.toHaveBeenCalled();
    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('allows super admin assignment for holding users', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({ id: 1, jobRole: 'holding' })
      .mockResolvedValueOnce({
        id: 1,
        name: 'Holding Admin',
        email: 'holding@zhao.test',
        accountStatus: 'approved',
        jobRole: 'holding',
        restaurant: {
          id: 99,
          name: 'ZHAO Holding',
        },
        userRoles: [
          {
            role: {
              name: 'super-admin',
              rolePermissions: [
                { permission: { key: 'system.permission.manage' } },
              ],
            },
          },
        ],
      });
    prismaService.role.findMany.mockResolvedValue([
      { id: 10, name: 'super-admin' },
    ]);

    await expect(
      service.updateUserRoles(1, ['super-admin']),
    ).resolves.toMatchObject({
      id: 1,
      jobRole: 'holding',
      roles: ['super-admin'],
    });
  });

  it('allows a store manager to update job roles for same-store employees', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 12,
        jobRole: 'front-of-house',
        restaurantId: 7,
      })
      .mockResolvedValueOnce({
        id: 12,
        name: 'Store Staff',
        email: 'staff@zhao.test',
        jobRole: 'front-manager,front-assistant',
        restaurant: {
          id: 7,
          name: 'ZHAO Test',
        },
        userRoles: [],
      });
    prismaService.user.update.mockResolvedValue({
      id: 12,
      jobRole: 'front-manager,front-assistant',
    });

    await expect(
      service.updateUserJobRole(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['employee.job_role.manage_store'],
        },
        12,
        'front-manager,front-assistant',
      ),
    ).resolves.toMatchObject({
      id: 12,
      jobRole: 'front-manager,front-assistant',
    });
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { jobRole: 'front-manager,front-assistant' },
    });
  });

  it('rejects store managers updating employees outside their store', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 8,
    });

    await expect(
      service.updateUserJobRole(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['employee.job_role.manage_store'],
        },
        12,
        'front-of-house',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects store managers assigning holding roles', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
    });

    await expect(
      service.updateUserJobRole(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['employee.job_role.manage_store'],
        },
        12,
        'front-server,holding',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects store managers assigning store manager job roles', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-server',
      restaurantId: 7,
    });

    await expect(
      service.updateUserJobRole(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['employee.job_role.manage_store'],
        },
        12,
        'store-manager',
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('lists all manageable restaurants for holding users', async () => {
    const { service, prismaService } = createService();
    prismaService.restaurant.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'ZHAO Opera',
        address: 'Paris',
        photoUrl: null,
      },
    ]);

    await expect(
      service.listManageableRestaurants({
        id: 1,
        familyName: 'Zhao',
        givenName: 'Admin',
        firstName: 'Admin',
        lastName: 'Zhao',
        name: 'Zhao Admin',
        email: 'admin@zhao.test',
        emailVerified: true,
        restaurantId: 99,
        store: {
          id: 99,
          name: 'ZHAO Holding',
          address: 'HQ',
          photoUrl: null,
        },
        storeName: 'ZHAO Holding',
        jobRole: 'holding',
        role: 'holding',
        position: 'holding',
        birthday: null,
        avatar: null,
        avatarUrl: null,
        phone: null,
        address: null,
        userLevel: 0,
        preferredLanguage: 'zh',
        permissions: ['system.permission.manage'],
      }),
    ).resolves.toEqual([
      {
        id: 1,
        name: 'ZHAO Opera',
        address: 'Paris',
        photoUrl: null,
      },
    ]);
    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith({
      where: {},
      select: {
        id: true,
        name: true,
        address: true,
        photoUrl: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  });

  it('limits manageable restaurants to the store manager restaurant', async () => {
    const { service, prismaService } = createService();
    prismaService.restaurant.findMany.mockResolvedValue([
      {
        id: 7,
        name: 'ZHAO Test',
        address: 'Test',
        photoUrl: null,
      },
    ]);

    await service.listManageableRestaurants({
      id: 1,
      familyName: 'Zhao',
      givenName: 'Manager',
      firstName: 'Manager',
      lastName: 'Zhao',
      name: 'Zhao Manager',
      email: 'manager@zhao.test',
      emailVerified: true,
      restaurantId: 7,
      store: {
        id: 7,
        name: 'ZHAO Test',
        address: 'Test',
        photoUrl: null,
      },
      storeName: 'ZHAO Test',
      jobRole: 'store-manager',
      role: 'store-manager',
      position: 'store-manager',
      birthday: null,
      avatar: null,
      avatarUrl: null,
      phone: null,
      address: null,
      userLevel: 0,
      preferredLanguage: 'zh',
      permissions: [],
    });

    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 7,
        },
      }),
    );
  });

  it('limits manageable restaurants to regional manager assignments', async () => {
    const { service, prismaService } = createService();
    prismaService.legacyUserManagedRestaurant.findMany.mockResolvedValue([
      { restaurantId: 3 },
      { restaurantId: 8 },
    ]);
    prismaService.restaurant.findMany.mockResolvedValue([
      {
        id: 3,
        name: 'ZHAO Opera',
        address: 'Paris',
        photoUrl: null,
      },
      {
        id: 8,
        name: 'ZHAO Next',
        address: 'Paris',
        photoUrl: null,
      },
    ]);

    await service.listManageableRestaurants({
      id: 21,
      familyName: 'Zhao',
      givenName: 'Regional',
      firstName: 'Regional',
      lastName: 'Zhao',
      name: 'Zhao Regional',
      email: 'regional@zhao.test',
      emailVerified: true,
      restaurantId: 99,
      store: {
        id: 99,
        name: 'ZHAO Holding',
        address: 'HQ',
        photoUrl: null,
      },
      storeName: 'ZHAO Holding',
      jobRole: 'regional-manager',
      role: 'regional-manager',
      position: 'regional-manager',
      birthday: null,
      avatar: null,
      avatarUrl: null,
      phone: null,
      address: null,
      userLevel: 0,
      preferredLanguage: 'zh',
      permissions: ['employee.job_role.manage_store'],
    });

    expect(
      prismaService.legacyUserManagedRestaurant.findMany,
    ).toHaveBeenCalledWith({
      where: {
        userId: 21,
      },
      select: {
        restaurantId: true,
      },
      orderBy: {
        restaurantId: 'asc',
      },
    });
    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: [3, 8],
          },
        },
      }),
    );
  });

  it('limits approvable users to regional manager assignments', async () => {
    const { service, prismaService } = createService();
    prismaService.legacyUserManagedRestaurant.findMany.mockResolvedValue([
      { restaurantId: 3 },
      { restaurantId: 8 },
    ]);
    prismaService.user.findMany.mockResolvedValue([]);

    await service.listApprovableUsers({
      id: 21,
      familyName: 'Zhao',
      givenName: 'Regional',
      firstName: 'Regional',
      lastName: 'Zhao',
      name: 'Zhao Regional',
      email: 'regional@zhao.test',
      emailVerified: true,
      restaurantId: 99,
      store: {
        id: 99,
        name: 'ZHAO Holding',
        address: 'HQ',
        photoUrl: null,
      },
      storeName: 'ZHAO Holding',
      jobRole: 'regional-manager',
      role: 'regional-manager',
      position: 'regional-manager',
      birthday: null,
      avatar: null,
      avatarUrl: null,
      phone: null,
      address: null,
      userLevel: 0,
      preferredLanguage: 'zh',
      permissions: ['employee.job_role.manage_store'],
    });

    expect(prismaService.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          restaurantId: {
            in: [3, 8],
          },
          accountStatus: {
            not: 'removed',
          },
        },
      }),
    );
  });

  it('hides pending management applications from non-holding reviewers', async () => {
    const { service, prismaService } = createService();
    const restaurant = { id: 7, name: 'ZHAO Test' };
    prismaService.user.findMany.mockResolvedValue([
      {
        id: 12,
        name: 'Line Staff',
        email: 'line@zhao.test',
        accountStatus: 'pending',
        jobRole: 'front-of-house',
        restaurant,
        userRoles: [],
      },
      {
        id: 13,
        name: 'Wannabe Manager',
        email: 'manager@zhao.test',
        accountStatus: 'pending',
        jobRole: 'store-manager',
        restaurant,
        userRoles: [],
      },
      {
        id: 14,
        name: 'Existing Manager',
        email: 'existing@zhao.test',
        accountStatus: 'approved',
        jobRole: 'store-manager',
        restaurant,
        userRoles: [],
      },
    ]);

    const result = await service.listApprovableUsers({
      id: 1,
      familyName: 'Zhao',
      givenName: 'Manager',
      firstName: 'Manager',
      lastName: 'Zhao',
      name: 'Zhao Manager',
      email: 'reviewer@zhao.test',
      emailVerified: true,
      restaurantId: 7,
      store: { id: 7, name: 'ZHAO Test', address: 'Test', photoUrl: null },
      storeName: 'ZHAO Test',
      jobRole: 'store-manager',
      role: 'store-manager',
      position: 'store-manager',
      birthday: null,
      avatar: null,
      avatarUrl: null,
      phone: null,
      address: null,
      userLevel: 0,
      preferredLanguage: 'zh',
      permissions: [],
    });

    expect(result.map((user) => user.email)).toEqual([
      'line@zhao.test',
      'existing@zhao.test',
    ]);
  });

  it('rejects store managers approving employees into another restaurant', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'pending',
    });

    await expect(
      service.updateUserApproval(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: [],
        },
        12,
        {
          accountStatus: 'approved',
          restaurantId: 8,
          jobRole: 'front-of-house',
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects store managers approving holding job roles', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'pending',
    });
    // Restaurant exists so the flow reaches the job-role authorization check
    // (granting a holding role is forbidden for a store manager).
    prismaService.restaurant.findUnique.mockResolvedValue({ id: 7 });

    await expect(
      service.updateUserApproval(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Manager',
          firstName: 'Manager',
          lastName: 'Zhao',
          name: 'Zhao Manager',
          email: 'manager@zhao.test',
          emailVerified: true,
          restaurantId: 7,
          store: {
            id: 7,
            name: 'ZHAO Test',
            address: 'Test',
            photoUrl: null,
          },
          storeName: 'ZHAO Test',
          jobRole: 'store-manager',
          role: 'store-manager',
          position: 'store-manager',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: [],
        },
        12,
        {
          accountStatus: 'approved',
          restaurantId: 7,
          jobRole: 'holding',
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('approves a user with updated restaurant and job role', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 12,
        jobRole: null,
        restaurantId: 7,
        accountStatus: 'pending',
      })
      .mockResolvedValueOnce({
        id: 12,
        name: 'New Staff',
        email: 'new@zhao.test',
        accountStatus: 'approved',
        jobRole: 'front-of-house,back-of-house',
        restaurant: {
          id: 8,
          name: 'ZHAO Next',
        },
        userRoles: [],
      });
    prismaService.restaurant.findUnique.mockResolvedValue({ id: 8 });
    prismaService.role.findUnique.mockResolvedValue({ id: 20 });
    prismaService.user.update.mockResolvedValue({
      id: 12,
      accountStatus: 'approved',
    });
    prismaService.userRole.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.updateUserApproval(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Admin',
          firstName: 'Admin',
          lastName: 'Zhao',
          name: 'Zhao Admin',
          email: 'admin@zhao.test',
          emailVerified: true,
          restaurantId: 99,
          store: {
            id: 99,
            name: 'ZHAO Holding',
            address: 'HQ',
            photoUrl: null,
          },
          storeName: 'ZHAO Holding',
          jobRole: 'holding',
          role: 'holding',
          position: 'holding',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['system.permission.manage'],
        },
        12,
        {
          accountStatus: 'approved',
          restaurantId: 8,
          jobRole: 'front-of-house,back-of-house',
        },
      ),
    ).resolves.toMatchObject({
      id: 12,
      accountStatus: 'approved',
      jobRole: 'front-of-house,back-of-house',
    });
    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        accountStatus: 'approved',
        accountReviewedAt: expect.any(Date) as Date,
        accountReviewedByUserId: 1,
        restaurantId: 8,
        jobRole: 'front-of-house,back-of-house',
      },
    });
  });

  const adminViewer = {
    id: 1,
    familyName: 'Zhao',
    givenName: 'Admin',
    firstName: 'Admin',
    lastName: 'Zhao',
    name: 'Zhao Admin',
    email: 'admin@zhao.test',
    emailVerified: true,
    restaurantId: 99,
    store: { id: 99, name: 'ZHAO Holding', address: 'HQ', photoUrl: null },
    storeName: 'ZHAO Holding',
    jobRole: 'holding',
    role: 'holding',
    position: 'holding',
    birthday: null,
    avatar: null,
    avatarUrl: null,
    phone: null,
    address: null,
    userLevel: 0,
    preferredLanguage: 'zh',
    permissions: ['system.permission.manage'],
  };

  it('sends a localized push to the user it approves', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 12,
        jobRole: 'front-of-house',
        restaurantId: 7,
        accountStatus: 'pending',
        preferredLanguage: 'en',
      })
      .mockResolvedValueOnce({
        id: 12,
        name: 'New Staff',
        email: 'new@zhao.test',
        accountStatus: 'approved',
        jobRole: 'front-of-house',
        restaurant: { id: 7, name: 'ZHAO Next' },
        userRoles: [],
      });
    prismaService.role.findUnique.mockResolvedValue({ id: 20 });
    prismaService.user.update.mockResolvedValue({
      id: 12,
      accountStatus: 'approved',
    });
    prismaService.userRole.createMany.mockResolvedValue({ count: 1 });

    await service.updateUserApproval(adminViewer, 12, {
      accountStatus: 'approved',
    });

    expect(notificationsService.sendToUsers).toHaveBeenCalledTimes(1);
    expect(notificationsService.sendToUsers).toHaveBeenCalledWith(
      [12],
      expect.objectContaining({
        title: 'Account approved',
        data: { type: 'account-approved' },
      }),
    );
  });

  it('does not push when a registration is rejected', async () => {
    const { service, prismaService, notificationsService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 12,
        jobRole: 'front-of-house',
        restaurantId: 7,
        accountStatus: 'pending',
        preferredLanguage: 'fr',
      })
      .mockResolvedValueOnce({
        id: 12,
        name: 'New Staff',
        email: 'new@zhao.test',
        accountStatus: 'rejected',
        jobRole: 'front-of-house',
        restaurant: { id: 7, name: 'ZHAO Next' },
        userRoles: [],
      });
    prismaService.user.update.mockResolvedValue({
      id: 12,
      accountStatus: 'rejected',
    });

    await service.updateUserApproval(adminViewer, 12, {
      accountStatus: 'rejected',
    });

    expect(notificationsService.sendToUsers).not.toHaveBeenCalled();
  });

  it('still approves when the push delivery fails', async () => {
    const { service, prismaService, notificationsService } = createService();
    notificationsService.sendToUsers.mockRejectedValueOnce(
      new Error('expo down'),
    );
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 12,
        jobRole: 'front-of-house',
        restaurantId: 7,
        accountStatus: 'pending',
        preferredLanguage: 'zh',
      })
      .mockResolvedValueOnce({
        id: 12,
        name: 'New Staff',
        email: 'new@zhao.test',
        accountStatus: 'approved',
        jobRole: 'front-of-house',
        restaurant: { id: 7, name: 'ZHAO Next' },
        userRoles: [],
      });
    prismaService.role.findUnique.mockResolvedValue({ id: 20 });
    prismaService.user.update.mockResolvedValue({
      id: 12,
      accountStatus: 'approved',
    });
    prismaService.userRole.createMany.mockResolvedValue({ count: 1 });

    await expect(
      service.updateUserApproval(adminViewer, 12, {
        accountStatus: 'approved',
      }),
    ).resolves.toMatchObject({ id: 12, accountStatus: 'approved' });
  });

  it('replaces managed restaurants for a regional manager', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique
      .mockResolvedValueOnce({
        id: 21,
        jobRole: 'regional-manager',
        restaurantId: 99,
        accountStatus: 'approved',
      })
      .mockResolvedValueOnce({
        id: 21,
        name: 'Zhao Regional',
        email: 'regional@zhao.test',
        accountStatus: 'approved',
        jobRole: 'regional-manager',
        restaurant: {
          id: 99,
          name: 'ZHAO Holding',
        },
        userRoles: [],
      });
    prismaService.restaurant.findMany
      .mockResolvedValueOnce([{ id: 3 }, { id: 8 }])
      .mockResolvedValueOnce([
        { id: 3, name: 'ZHAO Opera' },
        { id: 8, name: 'ZHAO Next' },
      ]);
    prismaService.legacyUserManagedRestaurant.findMany.mockResolvedValueOnce([
      { userId: 21, restaurantId: 3 },
      { userId: 21, restaurantId: 8 },
    ]);

    await expect(
      service.updateManagedRestaurants(21, [3, 8]),
    ).resolves.toMatchObject({
      id: 21,
      jobRole: 'regional-manager',
      managedRestaurants: [
        { id: 3, name: 'ZHAO Opera' },
        { id: 8, name: 'ZHAO Next' },
      ],
    });
    expect(
      prismaService.legacyUserManagedRestaurant.deleteMany,
    ).toHaveBeenCalledWith({
      where: { userId: 21 },
    });
    expect(
      prismaService.legacyUserManagedRestaurant.createMany,
    ).toHaveBeenCalledWith({
      data: [
        { userId: 21, restaurantId: 3 },
        { userId: 21, restaurantId: 8 },
      ],
    });
  });

  it('rejects managed restaurant updates for non-regional users', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 21,
      jobRole: 'store-manager',
      restaurantId: 7,
      accountStatus: 'approved',
    });

    await expect(
      service.updateManagedRestaurants(21, [3]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(
      prismaService.legacyUserManagedRestaurant.deleteMany,
    ).not.toHaveBeenCalled();
    expect(
      prismaService.legacyUserManagedRestaurant.createMany,
    ).not.toHaveBeenCalled();
  });

  it('rejects approving a user without a job role', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: null,
      restaurantId: 7,
      accountStatus: 'pending',
    });

    await expect(
      service.updateUserApproval(
        {
          id: 1,
          familyName: 'Zhao',
          givenName: 'Admin',
          firstName: 'Admin',
          lastName: 'Zhao',
          name: 'Zhao Admin',
          email: 'admin@zhao.test',
          emailVerified: true,
          restaurantId: 99,
          store: {
            id: 99,
            name: 'ZHAO Holding',
            address: 'HQ',
            photoUrl: null,
          },
          storeName: 'ZHAO Holding',
          jobRole: 'holding',
          role: 'holding',
          position: 'holding',
          birthday: null,
          avatar: null,
          avatarUrl: null,
          phone: null,
          address: null,
          userLevel: 0,
          preferredLanguage: 'zh',
          permissions: ['system.permission.manage'],
        },
        12,
        {
          accountStatus: 'approved',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('throws when updating roles for a missing user', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUserRoles(404, ['training-viewer']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  function makeStoreManagerViewer(restaurantId: number) {
    return {
      id: 1,
      familyName: 'Zhao',
      givenName: 'Manager',
      firstName: 'Manager',
      lastName: 'Zhao',
      name: 'Zhao Manager',
      email: 'manager@zhao.test',
      emailVerified: true,
      restaurantId,
      store: {
        id: restaurantId,
        name: 'ZHAO Test',
        address: 'Test',
        photoUrl: null,
      },
      storeName: 'ZHAO Test',
      jobRole: 'store-manager',
      role: 'store-manager',
      position: 'store-manager',
      birthday: null,
      avatar: null,
      avatarUrl: null,
      phone: null,
      address: null,
      userLevel: 0,
      preferredLanguage: 'zh',
      permissions: [],
    };
  }

  it('deactivates an employee in the store manager own store', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'approved',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).resolves.toEqual({ message: 'EMPLOYEE_REMOVED' });

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        accountStatus: 'removed',
        accountReviewedAt: expect.any(Date) as Date,
        accountReviewedByUserId: 1,
      },
    });
    expect(prismaService.refreshSession.deleteMany).toHaveBeenCalledWith({
      where: { userId: 12 },
    });
  });

  it('hard deletes a rejected account in the store manager own store', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'rejected',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).resolves.toEqual({ message: 'EMPLOYEE_DELETED' });

    expect(prismaService.user.delete).toHaveBeenCalledWith({
      where: { id: 12 },
    });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('hard deletes a rejected account even when it has a holding job role', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'holding',
      restaurantId: 7,
      accountStatus: 'rejected',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).resolves.toEqual({ message: 'EMPLOYEE_DELETED' });

    expect(prismaService.user.delete).toHaveBeenCalledWith({
      where: { id: 12 },
    });
  });

  it('returns a conflict when a rejected account still has linked data', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'rejected',
    });
    prismaService.user.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('FK', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects deactivating an employee in another store', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 8,
      accountStatus: 'approved',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating a holding account', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'holding',
      restaurantId: 7,
      accountStatus: 'approved',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).rejects.toMatchObject({ status: 403 });
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating yourself', async () => {
    const { service, prismaService } = createService();

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 1),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating an already removed employee', async () => {
    const { service, prismaService } = createService();
    prismaService.user.findUnique.mockResolvedValue({
      id: 12,
      jobRole: 'front-of-house',
      restaurantId: 7,
      accountStatus: 'removed',
    });

    await expect(
      service.removeUser(makeStoreManagerViewer(7), 12),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaService.user.update).not.toHaveBeenCalled();
  });
});

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BUILT_IN_ROLE_NAMES,
  PermissionRoleItem,
  PermissionUserItem,
} from './permissions.types';

type PermissionRoleRow = {
  id: number;
  name: string;
  description: string | null;
  rolePermissions: {
    permission: {
      key: string;
    };
  }[];
};

type PermissionUserRow = {
  id: number;
  name: string;
  email: string;
  jobRole: string | null;
  restaurant: {
    id: number;
    name: string;
  };
  userRoles: {
    role: {
      name: string;
      rolePermissions: {
        permission: {
          key: string;
        };
      }[];
    };
  }[];
};

type PermissionUserRoleScope = {
  id: number;
  jobRole: string | null;
  restaurantId: number;
};

const SUPER_ADMIN_ROLE_NAME = 'super-admin';
const HOLDING_JOB_ROLE = 'holding';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';
const MANAGE_STORE_JOB_ROLES_PERMISSION = 'employee.job_role.manage_store';
const SYSTEM_PERMISSION_MANAGE = 'system.permission.manage';
const MANAGEABLE_JOB_ROLE_VALUES = new Set([
  'front-of-house',
  'back-of-house',
  'cash',
  'all-rounder',
  'store-manager',
  'regional-manager',
]);

const BUILT_IN_ROLE_ORDER = new Map<string, number>(
  BUILT_IN_ROLE_NAMES.map((roleName, index) => [roleName, index]),
);

function sortRoleNames(roleNames: string[]): string[] {
  return [...roleNames].sort(
    (left, right) =>
      (BUILT_IN_ROLE_ORDER.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (BUILT_IN_ROLE_ORDER.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      left.localeCompare(right),
  );
}

function toPermissionRoleItem(row: PermissionRoleRow): PermissionRoleItem {
  return {
    name: row.name,
    description: row.description,
    permissions: row.rolePermissions
      .map((rolePermission) => rolePermission.permission.key)
      .sort(),
  };
}

function toPermissionUserItem(row: PermissionUserRow): PermissionUserItem {
  const roleNames = row.userRoles.map((userRole) => userRole.role.name);
  const permissions = row.userRoles.flatMap((userRole) =>
    userRole.role.rolePermissions.map(
      (rolePermission) => rolePermission.permission.key,
    ),
  );

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    restaurant: row.restaurant,
    jobRole: row.jobRole,
    roles: sortRoleNames(roleNames),
    permissions: [...new Set(permissions)].sort(),
  };
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listRoles(): Promise<PermissionRoleItem[]> {
    const roles = await this.prismaService.role.findMany({
      where: {
        name: {
          in: [...BUILT_IN_ROLE_NAMES],
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        rolePermissions: {
          select: {
            permission: {
              select: {
                key: true,
              },
            },
          },
        },
      },
    });

    return roles
      .sort(
        (left, right) =>
          (BUILT_IN_ROLE_ORDER.get(left.name) ?? Number.MAX_SAFE_INTEGER) -
          (BUILT_IN_ROLE_ORDER.get(right.name) ?? Number.MAX_SAFE_INTEGER),
      )
      .map(toPermissionRoleItem);
  }

  async listUsers(): Promise<PermissionUserItem[]> {
    const users = await this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        jobRole: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ restaurantId: 'asc' }, { id: 'asc' }],
    });

    return users.map(toPermissionUserItem);
  }

  async updateUserRoles(
    userId: number,
    roleNames: string[],
  ): Promise<PermissionUserItem> {
    const user = await this.getUserRoleScope(userId);
    this.assertRoleAssignmentAllowed(user, roleNames);

    const roles = await this.prismaService.role.findMany({
      where: {
        name: {
          in: roleNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (roles.length !== roleNames.length) {
      throw new BadRequestException('UNKNOWN_ROLE');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: { userId },
      });

      if (roles.length === 0) {
        return;
      }

      await tx.userRole.createMany({
        data: roles.map((role) => ({
          userId,
          roleId: role.id,
        })),
      });
    });

    return this.getUser(userId);
  }

  async updateUserJobRole(
    viewer: AuthUser,
    userId: number,
    jobRole: string,
  ): Promise<PermissionUserItem> {
    const targetUser = await this.getUserRoleScope(userId);
    this.assertJobRoleUpdateAllowed(viewer, targetUser, jobRole);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { jobRole },
    });

    return this.getUser(userId);
  }

  private assertRoleAssignmentAllowed(
    user: PermissionUserRoleScope,
    roleNames: string[],
  ): void {
    if (
      roleNames.includes(SUPER_ADMIN_ROLE_NAME) &&
      user.jobRole !== HOLDING_JOB_ROLE
    ) {
      throw new BadRequestException('SUPER_ADMIN_REQUIRES_HOLDING');
    }
  }

  private async getUserRoleScope(
    userId: number,
  ): Promise<PermissionUserRoleScope> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        jobRole: true,
        restaurantId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return user;
  }

  private assertJobRoleUpdateAllowed(
    viewer: AuthUser,
    targetUser: PermissionUserRoleScope,
    jobRole: string,
  ): void {
    if (
      viewer.jobRole === HOLDING_JOB_ROLE &&
      viewer.permissions.includes(SYSTEM_PERMISSION_MANAGE)
    ) {
      return;
    }

    if (targetUser.jobRole === HOLDING_JOB_ROLE) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const viewerRoles = new Set(
      `${viewer.jobRole || ''}`
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean),
    );
    const isRegionalManager = viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE);
    const canManageStore =
      isRegionalManager ||
      viewerRoles.has(STORE_MANAGER_JOB_ROLE) ||
      viewer.permissions.includes(MANAGE_STORE_JOB_ROLES_PERMISSION);

    if (
      !canManageStore ||
      (!isRegionalManager && viewer.restaurantId !== targetUser.restaurantId)
    ) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const nextRoles = jobRole.split(',');
    const isStoreRoleUpdate = nextRoles.every((role) =>
      MANAGEABLE_JOB_ROLE_VALUES.has(role),
    );

    if (!isStoreRoleUpdate) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }
  }

  private async getUser(userId: number): Promise<PermissionUserItem> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        jobRole: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return toPermissionUserItem(user);
  }
}

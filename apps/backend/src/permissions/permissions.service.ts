import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    await this.ensureUserExists(userId);
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

  private async ensureUserExists(userId: number): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
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

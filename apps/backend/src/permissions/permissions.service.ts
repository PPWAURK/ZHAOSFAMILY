import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.service';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserApprovalDto } from './dto/update-user-approval.dto';
import {
  BUILT_IN_ROLE_NAMES,
  ManageableRestaurantItem,
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
  accountStatus: string;
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
  accountStatus: string;
};

type ManagedRestaurantRow = {
  userId: number;
  restaurantId: number;
};

const SUPER_ADMIN_ROLE_NAME = 'super-admin';
const TRAINING_VIEWER_ROLE_NAME = 'training-viewer';
const HOLDING_JOB_ROLE = 'holding';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';
const MANAGE_STORE_JOB_ROLES_PERMISSION = 'employee.job_role.manage_store';
const SYSTEM_PERMISSION_MANAGE = 'system.permission.manage';
const MANAGEABLE_JOB_ROLE_VALUES = new Set([
  'front-of-house',
  'back-of-house',
  'front-manager',
  'back-manager',
  'front-assistant',
  'back-assistant',
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

function toPermissionUserItem(
  row: PermissionUserRow,
  managedRestaurantsByUserId: Map<
    number,
    PermissionUserItem['managedRestaurants']
  >,
): PermissionUserItem {
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
    accountStatus: row.accountStatus,
    restaurant: row.restaurant,
    jobRole: row.jobRole,
    managedRestaurants: managedRestaurantsByUserId.get(row.id) ?? [],
    roles: sortRoleNames(roleNames),
    permissions: [...new Set(permissions)].sort(),
  };
}

function buildManagedRestaurantsByUserId(
  rows: ManagedRestaurantRow[],
  restaurantsById: Map<number, { id: number; name: string }>,
): Map<number, PermissionUserItem['managedRestaurants']> {
  const managedRestaurantsByUserId = new Map<
    number,
    PermissionUserItem['managedRestaurants']
  >();

  for (const row of rows) {
    const restaurant = restaurantsById.get(row.restaurantId);

    if (!restaurant) {
      continue;
    }

    const currentRestaurants = managedRestaurantsByUserId.get(row.userId) ?? [];

    managedRestaurantsByUserId.set(row.userId, [
      ...currentRestaurants,
      restaurant,
    ]);
  }

  return managedRestaurantsByUserId;
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
    const users = await this.findPermissionUsers();
    const managedRestaurantsByUserId =
      await this.findManagedRestaurantsByUserId(users.map((user) => user.id));

    return users.map((user) =>
      toPermissionUserItem(user, managedRestaurantsByUserId),
    );
  }

  async listApprovableUsers(viewer: AuthUser): Promise<PermissionUserItem[]> {
    const where = await this.getApprovalUserWhere(viewer);
    const users = await this.findPermissionUsers(where);
    const managedRestaurantsByUserId =
      await this.findManagedRestaurantsByUserId(users.map((user) => user.id));

    return users.map((user) =>
      toPermissionUserItem(user, managedRestaurantsByUserId),
    );
  }

  async listManageableRestaurants(
    viewer: AuthUser,
  ): Promise<ManageableRestaurantItem[]> {
    const where = await this.getManageableRestaurantWhere(viewer);

    return this.prismaService.restaurant.findMany({
      where,
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
  }

  private findPermissionUsers(
    where?: Prisma.UserWhereInput,
  ): Promise<PermissionUserRow[]> {
    return this.prismaService.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
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

  async updateUserApproval(
    viewer: AuthUser,
    userId: number,
    dto: UpdateUserApprovalDto,
  ): Promise<PermissionUserItem> {
    const targetUser = await this.getUserRoleScope(userId);
    await this.assertApprovalAllowed(viewer, targetUser);
    await this.assertApprovalRestaurantAllowed(
      viewer,
      targetUser,
      dto.restaurantId,
    );

    if (dto.restaurantId) {
      await this.assertRestaurantExists(dto.restaurantId);
    }

    const nextJobRole = dto.jobRole ?? targetUser.jobRole;
    if (dto.accountStatus === ACCOUNT_STATUS.approved && !nextJobRole) {
      throw new BadRequestException('INVALID_JOB_ROLE');
    }
    if (dto.accountStatus === ACCOUNT_STATUS.approved && nextJobRole) {
      this.assertApprovalJobRoleAllowed(viewer, nextJobRole);
    }

    const reviewData = {
      accountStatus: dto.accountStatus,
      accountReviewedAt: new Date(),
      accountReviewedByUserId: viewer.id,
      ...(dto.restaurantId ? { restaurantId: dto.restaurantId } : {}),
      ...(dto.jobRole ? { jobRole: dto.jobRole } : {}),
    };

    if (dto.accountStatus === ACCOUNT_STATUS.rejected) {
      await this.prismaService.user.update({
        where: { id: userId },
        data: reviewData,
      });

      return this.getUser(userId);
    }

    await this.prismaService.$transaction(async (tx) => {
      const trainingViewerRole = await tx.role.findUnique({
        where: { name: TRAINING_VIEWER_ROLE_NAME },
        select: { id: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: reviewData,
      });

      if (!trainingViewerRole) {
        return;
      }

      await tx.userRole.createMany({
        data: [
          {
            userId,
            roleId: trainingViewerRole.id,
          },
        ],
        skipDuplicates: true,
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
    await this.assertJobRoleUpdateAllowed(viewer, targetUser, jobRole);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { jobRole },
    });

    return this.getUser(userId);
  }

  async updateManagedRestaurants(
    userId: number,
    restaurantIds: number[],
  ): Promise<PermissionUserItem> {
    const user = await this.getUserRoleScope(userId);

    if (!this.parseJobRoles(user.jobRole).has(REGIONAL_MANAGER_JOB_ROLE)) {
      throw new BadRequestException('REGIONAL_MANAGER_REQUIRED');
    }

    const restaurants = await this.prismaService.restaurant.findMany({
      where: {
        id: {
          in: restaurantIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (restaurants.length !== restaurantIds.length) {
      throw new BadRequestException('RESTAURANT_NOT_FOUND');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.legacyUserManagedRestaurant.deleteMany({
        where: { userId },
      });

      if (restaurantIds.length === 0) {
        return;
      }

      await tx.legacyUserManagedRestaurant.createMany({
        data: restaurantIds.map((restaurantId) => ({
          userId,
          restaurantId,
        })),
      });
    });

    return this.getUser(userId);
  }

  private async getApprovalUserWhere(
    viewer: AuthUser,
  ): Promise<Prisma.UserWhereInput> {
    if (this.hasHoldingScope(viewer)) {
      return {};
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);

    if (viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE)) {
      const restaurantIds = await this.findRegionalManagedRestaurantIds(
        viewer.id,
      );

      return {
        restaurantId: {
          in: restaurantIds,
        },
      };
    }

    if (viewerRoles.has(STORE_MANAGER_JOB_ROLE)) {
      return {
        restaurantId: viewer.restaurantId,
      };
    }

    throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
  }

  private async getManageableRestaurantWhere(
    viewer: AuthUser,
  ): Promise<Prisma.RestaurantWhereInput> {
    if (this.hasHoldingScope(viewer)) {
      return {};
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);

    if (viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE)) {
      const restaurantIds = await this.findRegionalManagedRestaurantIds(
        viewer.id,
      );

      return {
        id: {
          in: restaurantIds,
        },
      };
    }

    if (viewerRoles.has(STORE_MANAGER_JOB_ROLE)) {
      return {
        id: viewer.restaurantId,
      };
    }

    throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
  }

  private assertRoleAssignmentAllowed(
    user: PermissionUserRoleScope,
    roleNames: string[],
  ): void {
    if (
      roleNames.includes(SUPER_ADMIN_ROLE_NAME) &&
      !this.parseJobRoles(user.jobRole).has(HOLDING_JOB_ROLE)
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
        accountStatus: true,
      },
    });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    return user;
  }

  private async assertApprovalAllowed(
    viewer: AuthUser,
    targetUser: PermissionUserRoleScope,
  ): Promise<void> {
    if (this.hasHoldingScope(viewer)) {
      return;
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);
    if (viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE)) {
      await this.assertRegionalRestaurantAllowed(
        viewer.id,
        targetUser.restaurantId,
      );
      return;
    }

    if (
      viewerRoles.has(STORE_MANAGER_JOB_ROLE) &&
      viewer.restaurantId === targetUser.restaurantId
    ) {
      return;
    }

    throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
  }

  private async assertApprovalRestaurantAllowed(
    viewer: AuthUser,
    targetUser: PermissionUserRoleScope,
    nextRestaurantId: number | undefined,
  ): Promise<void> {
    if (this.hasHoldingScope(viewer)) {
      return;
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);
    const restaurantId = nextRestaurantId ?? targetUser.restaurantId;

    if (viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE)) {
      await this.assertRegionalRestaurantAllowed(viewer.id, restaurantId);
      return;
    }

    if (
      viewerRoles.has(STORE_MANAGER_JOB_ROLE) &&
      restaurantId === viewer.restaurantId
    ) {
      return;
    }

    throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
  }

  private assertApprovalJobRoleAllowed(
    viewer: AuthUser,
    jobRole: string,
  ): void {
    if (this.hasHoldingScope(viewer)) {
      return;
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);
    const canApproveStoreJobRole =
      viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE) ||
      viewerRoles.has(STORE_MANAGER_JOB_ROLE) ||
      viewer.permissions.includes(MANAGE_STORE_JOB_ROLES_PERMISSION);

    if (
      canApproveStoreJobRole &&
      this.areStoreJobRolesManageable(this.parseJobRoles(jobRole))
    ) {
      return;
    }

    throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
  }

  private async assertJobRoleUpdateAllowed(
    viewer: AuthUser,
    targetUser: PermissionUserRoleScope,
    jobRole: string,
  ): Promise<void> {
    if (this.hasHoldingScope(viewer)) {
      return;
    }

    if (this.parseJobRoles(targetUser.jobRole).has(HOLDING_JOB_ROLE)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);
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

    if (isRegionalManager) {
      await this.assertRegionalRestaurantAllowed(
        viewer.id,
        targetUser.restaurantId,
      );
    }

    if (!this.areStoreJobRolesManageable(this.parseJobRoles(jobRole))) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }
  }

  private async assertRestaurantExists(restaurantId: number): Promise<void> {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new BadRequestException('RESTAURANT_NOT_FOUND');
    }
  }

  private async assertRegionalRestaurantAllowed(
    viewerId: number,
    restaurantId: number,
  ): Promise<void> {
    const managedRestaurant =
      await this.prismaService.legacyUserManagedRestaurant.findUnique({
        where: {
          userId_restaurantId: {
            userId: viewerId,
            restaurantId,
          },
        },
        select: {
          restaurantId: true,
        },
      });

    if (!managedRestaurant) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }
  }

  private async findRegionalManagedRestaurantIds(
    viewerId: number,
  ): Promise<number[]> {
    const rows = await this.prismaService.legacyUserManagedRestaurant.findMany({
      where: {
        userId: viewerId,
      },
      select: {
        restaurantId: true,
      },
      orderBy: {
        restaurantId: 'asc',
      },
    });

    return rows.map((row) => row.restaurantId);
  }

  private async findManagedRestaurantsByUserId(
    userIds: number[],
  ): Promise<Map<number, PermissionUserItem['managedRestaurants']>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const rows = await this.prismaService.legacyUserManagedRestaurant.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      select: {
        userId: true,
        restaurantId: true,
      },
      orderBy: {
        restaurantId: 'asc',
      },
    });

    const restaurantIds = [...new Set(rows.map((row) => row.restaurantId))];
    const restaurants = await this.prismaService.restaurant.findMany({
      where: {
        id: {
          in: restaurantIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const restaurantsById = new Map(
      restaurants.map((restaurant) => [restaurant.id, restaurant]),
    );

    return buildManagedRestaurantsByUserId(rows, restaurantsById);
  }

  private hasHoldingScope(viewer: AuthUser): boolean {
    return (
      this.parseJobRoles(viewer.jobRole).has(HOLDING_JOB_ROLE) ||
      viewer.permissions.includes(SYSTEM_PERMISSION_MANAGE)
    );
  }

  private areStoreJobRolesManageable(jobRoles: Set<string>): boolean {
    return (
      jobRoles.size > 0 &&
      [...jobRoles].every((role) => MANAGEABLE_JOB_ROLE_VALUES.has(role))
    );
  }

  private parseJobRoles(jobRole: string | null | undefined): Set<string> {
    return new Set(
      `${jobRole || ''}`
        .split(',')
        .map((role) => role.trim())
        .filter(Boolean),
    );
  }

  private async getUser(userId: number): Promise<PermissionUserItem> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        accountStatus: true,
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

    const managedRestaurantsByUserId =
      await this.findManagedRestaurantsByUserId([userId]);

    return toPermissionUserItem(user, managedRestaurantsByUserId);
  }
}

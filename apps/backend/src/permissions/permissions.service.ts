import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService, type AuthUser } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { accountApprovedNotification } from '../notifications/notification-content';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_ROLE_VALUES } from '../auth/job-roles';
import { UpdateUserApprovalDto } from './dto/update-user-approval.dto';
import { SendEmployeeInvitationDto } from './dto/send-employee-invitation.dto';
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
  name: string;
  email: string;
  jobRole: string | null;
  restaurantId: number;
  accountStatus: string;
  preferredLanguage: string | null;
};

type ManagedRestaurantRow = {
  userId: number;
  restaurantId: number;
};

type TrainingPositionRoleRow = {
  code: string;
  parentCode: string | null;
};

const SUPER_ADMIN_ROLE_NAME = 'super-admin';
const TRAINING_VIEWER_ROLE_NAME = 'training-viewer';
const HOLDING_JOB_ROLE = 'holding';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';
// Pending applications for these management-level positions are only reviewable
// by holding — they must stay hidden from store/regional managers' approval lists.
const ELEVATED_APPLICATION_JOB_ROLES = new Set([
  HOLDING_JOB_ROLE,
  REGIONAL_MANAGER_JOB_ROLE,
  STORE_MANAGER_JOB_ROLE,
]);
const MANAGE_STORE_JOB_ROLES_PERMISSION = 'employee.job_role.manage_store';
const SYSTEM_PERMISSION_MANAGE = 'system.permission.manage';
const STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES = new Set([
  'front-manager',
  'back-manager',
  'front-assistant',
  'back-assistant',
  'front-of-house',
  'back-of-house',
  'front-server',
  'front-host',
  'front-cashier',
  'front-packer',
  'front-bar',
  'back-dishwasher',
  'back-noodle',
  'back-hot-appetizer',
  'back-cold-appetizer',
  'back-rice',
]);
const REGIONAL_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES = new Set([
  STORE_MANAGER_JOB_ROLE,
  ...STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES,
]);
const MANAGEMENT_TRAINING_POSITION_CODES = new Set([
  'ALL',
  'SM',
  'RM',
  'HOLDING',
]);
const STORE_ASSIGNABLE_TRAINING_POSITION_ROOT_CODES = new Set([
  'FRONT_OF_HOUSE',
  'KITCHEN',
  // Existing stores may still have custom positions under the former roots
  // until the data migration has run.
  'FOH',
  'BOH',
]);
const BUILT_IN_JOB_ROLE_VALUES = new Set<string>(JOB_ROLE_VALUES);

const BUILT_IN_ROLE_ORDER = new Map<string, number>(
  BUILT_IN_ROLE_NAMES.map((roleName, index) => [roleName, index]),
);

function resolveInvitationLanguage(
  preferredLanguage: string | null | undefined,
  requestedLanguage: 'zh' | 'en' | 'fr',
): 'zh' | 'en' | 'fr' {
  if (preferredLanguage === 'zh' || preferredLanguage === 'en') {
    return preferredLanguage;
  }

  if (preferredLanguage === 'fr') {
    return 'fr';
  }

  return requestedLanguage;
}

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
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

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
    const scopeWhere = await this.getApprovalUserWhere(viewer);
    const where: Prisma.UserWhereInput = {
      ...scopeWhere,
      accountStatus: { not: ACCOUNT_STATUS.removed },
    };
    const users = await this.findPermissionUsers(where);
    const visibleUsers = this.hasHoldingScope(viewer)
      ? users
      : users.filter((user) => this.isApplicationVisibleToManager(user));
    const managedRestaurantsByUserId =
      await this.findManagedRestaurantsByUserId(
        visibleUsers.map((user) => user.id),
      );

    return visibleUsers.map((user) =>
      toPermissionUserItem(user, managedRestaurantsByUserId),
    );
  }

  // Management-level applications (店长/区域经理/总部) are reserved for holding;
  // already-approved staff stay visible so store teams render correctly.
  private isApplicationVisibleToManager(user: PermissionUserRow): boolean {
    if (user.accountStatus !== ACCOUNT_STATUS.pending) {
      return true;
    }

    return ![...this.parseJobRoles(user.jobRole)].some((role) =>
      ELEVATED_APPLICATION_JOB_ROLES.has(role),
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
        storeCode: true,
        name: true,
        address: true,
        photoObjectKey: true,
      },
      orderBy: {
        storeCode: 'asc',
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

    this.authService.invalidateUserPermissions(userId);

    return this.getUser(userId);
  }

  async sendEmployeeInvitation(
    viewer: AuthUser,
    dto: SendEmployeeInvitationDto,
  ): Promise<void> {
    if (!this.parseJobRoles(viewer.jobRole).has(STORE_MANAGER_JOB_ROLE)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const jobRole = await this.resolveStoreManagerInvitationJobRole(
      dto.jobRole,
    );

    await this.authService.sendEmployeeInvitation({
      email: dto.email,
      inviterName: viewer.name?.trim() || viewer.email || viewer.store.name,
      jobRole,
      // The inviter's saved language is the source of truth. The request
      // language remains a legacy fallback for accounts created before it.
      language: resolveInvitationLanguage(
        viewer.preferredLanguage,
        dto.language,
      ),
      restaurantId: viewer.restaurantId,
      storeName: viewer.store.name,
    });
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
    const normalizedJobRole =
      dto.accountStatus === ACCOUNT_STATUS.approved && nextJobRole
        ? await this.resolveAssignableJobRole(viewer, nextJobRole)
        : null;

    const reviewData = {
      accountStatus: dto.accountStatus,
      accountReviewedAt: new Date(),
      accountReviewedByUserId: viewer.id,
      ...(dto.restaurantId ? { restaurantId: dto.restaurantId } : {}),
      ...(dto.jobRole && normalizedJobRole
        ? { jobRole: normalizedJobRole }
        : {}),
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

    this.authService.invalidateUserPermissions(userId);

    await this.notifyAccountApproved(targetUser);

    return this.getUser(userId);
  }

  /**
   * Best-effort push to a freshly approved user. A delivery failure must never
   * fail the approval itself, so errors are swallowed after logging.
   */
  private async notifyAccountApproved(
    user: PermissionUserRoleScope,
  ): Promise<void> {
    await Promise.all([
      this.sendAccountApprovedPush(user.id, user.preferredLanguage),
      this.sendAccountApprovedEmail(user),
    ]);
  }

  private async sendAccountApprovedPush(
    userId: number,
    language: string | null,
  ): Promise<void> {
    try {
      await this.notificationsService.sendToUsers(
        [userId],
        accountApprovedNotification(language),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send account-approved push to user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async sendAccountApprovedEmail(
    user: PermissionUserRoleScope,
  ): Promise<void> {
    try {
      await this.mailService.sendEmployeeApprovedEmail({
        to: user.email,
        employeeName: user.name,
        language: user.preferredLanguage ?? undefined,
      });
    } catch (error) {
      this.logger.warn(
        `Account-approved email failed for ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async updateUserJobRole(
    viewer: AuthUser,
    userId: number,
    jobRole: string,
  ): Promise<PermissionUserItem> {
    const targetUser = await this.getUserRoleScope(userId);
    await this.assertJobRoleUpdateAllowed(viewer, targetUser);
    const normalizedJobRole = await this.resolveAssignableJobRole(
      viewer,
      jobRole,
    );

    await this.prismaService.user.update({
      where: { id: userId },
      data: { jobRole: normalizedJobRole },
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

  async removeUser(
    viewer: AuthUser,
    userId: number,
  ): Promise<{ message: 'EMPLOYEE_REMOVED' | 'EMPLOYEE_DELETED' }> {
    if (viewer.id === userId) {
      throw new BadRequestException('CANNOT_REMOVE_SELF');
    }

    const targetUser = await this.getUserRoleScope(userId);

    // Reuse the approval store-scope check (holding → all, regional → managed
    // restaurants, store-manager → own store).
    await this.assertApprovalAllowed(viewer, targetUser);

    // Rejected registrations were never approved and have no operational
    // history → hard delete so the email can be reused, regardless of the job
    // role they registered with. Cascades clean up roles/sessions; any other
    // linked row (P2003) means the account is not safe to delete.
    if (targetUser.accountStatus === ACCOUNT_STATUS.rejected) {
      return this.hardDeleteUser(userId);
    }

    // Active holding accounts cannot be deactivated from the store view.
    if (this.parseJobRoles(targetUser.jobRole).has(HOLDING_JOB_ROLE)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    if (targetUser.accountStatus === ACCOUNT_STATUS.removed) {
      throw new BadRequestException('USER_ALREADY_REMOVED');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          accountStatus: ACCOUNT_STATUS.removed,
          accountReviewedAt: new Date(),
          accountReviewedByUserId: viewer.id,
        },
      });

      // Revoke refresh sessions so the removed employee cannot stay signed in.
      await tx.refreshSession.deleteMany({ where: { userId } });
    });

    return { message: 'EMPLOYEE_REMOVED' };
  }

  private async hardDeleteUser(
    userId: number,
  ): Promise<{ message: 'EMPLOYEE_DELETED' }> {
    try {
      await this.prismaService.user.delete({ where: { id: userId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new ConflictException('USER_HAS_LINKED_DATA');
        }

        if (error.code === 'P2025') {
          throw new NotFoundException('USER_NOT_FOUND');
        }
      }

      throw error;
    }

    return { message: 'EMPLOYEE_DELETED' };
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
        name: true,
        email: true,
        jobRole: true,
        restaurantId: true,
        accountStatus: true,
        preferredLanguage: true,
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

  private async assertJobRoleUpdateAllowed(
    viewer: AuthUser,
    targetUser: PermissionUserRoleScope,
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

  private async resolveAssignableJobRole(
    viewer: AuthUser,
    jobRole: string,
  ): Promise<string> {
    const jobRoles = [...this.parseJobRoles(jobRole)];

    if (jobRoles.length === 0) {
      throw new BadRequestException('INVALID_JOB_ROLE');
    }

    const customPositionRoles = jobRoles.filter(
      (role) => !BUILT_IN_JOB_ROLE_VALUES.has(role.toLowerCase()),
    );
    const positions =
      await this.findActiveTrainingPositions(customPositionRoles);
    const positionsByCode = new Map(
      positions.map((position) => [position.code, position]),
    );

    if (
      customPositionRoles.some(
        (role) => !positionsByCode.has(role.toUpperCase()),
      )
    ) {
      throw new BadRequestException('INVALID_JOB_ROLE');
    }

    const normalizedJobRoles = jobRoles.map((role) => {
      const builtInRole = role.toLowerCase();

      return BUILT_IN_JOB_ROLE_VALUES.has(builtInRole)
        ? builtInRole
        : positionsByCode.get(role.toUpperCase())!.code;
    });

    if (
      !this.areJobRolesAssignableByViewer(
        viewer,
        normalizedJobRoles,
        positionsByCode,
      )
    ) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    return [...new Set(normalizedJobRoles)].join(',');
  }

  private async resolveStoreManagerInvitationJobRole(
    jobRole: string,
  ): Promise<string> {
    const jobRoles = [...this.parseJobRoles(jobRole)];

    if (jobRoles.length !== 1) {
      throw new BadRequestException('INVALID_JOB_ROLE');
    }

    const [jobRoleValue] = jobRoles;
    const normalizedBuiltInRole = jobRoleValue.toLowerCase();

    if (BUILT_IN_JOB_ROLE_VALUES.has(normalizedBuiltInRole)) {
      if (
        !STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES.has(normalizedBuiltInRole)
      ) {
        throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
      }

      return normalizedBuiltInRole;
    }

    const positions = await this.findActiveTrainingPositions([jobRoleValue]);
    const positionsByCode = new Map(
      positions.map((position) => [position.code, position]),
    );
    const positionCode = jobRoleValue.toUpperCase();

    if (!positionsByCode.has(positionCode)) {
      throw new BadRequestException('INVALID_JOB_ROLE');
    }

    if (
      !this.isStoreAssignableTrainingPosition(positionCode, positionsByCode)
    ) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    return positionsByCode.get(positionCode)!.code;
  }

  private async findActiveTrainingPositions(
    customPositionRoles: string[],
  ): Promise<TrainingPositionRoleRow[]> {
    if (customPositionRoles.length === 0) {
      return [];
    }

    return this.prismaService.trainingPosition.findMany({
      where: { isActive: true },
      select: { code: true, parentCode: true },
    });
  }

  private areJobRolesAssignableByViewer(
    viewer: AuthUser,
    jobRoles: string[],
    positionsByCode: Map<string, TrainingPositionRoleRow>,
  ): boolean {
    if (jobRoles.length === 0) {
      return false;
    }

    if (this.hasHoldingScope(viewer)) {
      return true;
    }

    const viewerRoles = this.parseJobRoles(viewer.jobRole);
    const assignableRoles = viewerRoles.has(REGIONAL_MANAGER_JOB_ROLE)
      ? REGIONAL_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES
      : viewerRoles.has(STORE_MANAGER_JOB_ROLE) ||
          viewer.permissions.includes(MANAGE_STORE_JOB_ROLES_PERMISSION)
        ? STORE_MANAGER_ASSIGNABLE_JOB_ROLE_VALUES
        : new Set<string>();

    return jobRoles.every((role) => {
      if (BUILT_IN_JOB_ROLE_VALUES.has(role)) {
        return assignableRoles.has(role);
      }

      return this.isStoreAssignableTrainingPosition(role, positionsByCode);
    });
  }

  private isStoreAssignableTrainingPosition(
    positionCode: string,
    positionsByCode: Map<string, TrainingPositionRoleRow>,
  ): boolean {
    const visited = new Set<string>();
    let position = positionsByCode.get(positionCode);

    while (position && !visited.has(position.code)) {
      if (MANAGEMENT_TRAINING_POSITION_CODES.has(position.code)) {
        return false;
      }
      if (STORE_ASSIGNABLE_TRAINING_POSITION_ROOT_CODES.has(position.code)) {
        return true;
      }

      visited.add(position.code);
      position = position.parentCode
        ? positionsByCode.get(position.parentCode)
        : undefined;
    }

    return false;
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

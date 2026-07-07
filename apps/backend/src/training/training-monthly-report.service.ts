import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  TrainingMonthlyReport,
  TrainingMonthlyReportStoreItem,
} from './training.types';
import {
  getRoleValues,
  resolveTrainingPositionCodes,
} from './training-position-resolver';
import type {
  TrainingJobRolePositionRow,
  TrainingPositionResolverPositionRow,
} from './training-position-resolver';

type ReportViewer = {
  id: number;
  jobRole: string | null;
  restaurantId: number;
  store: {
    id: number;
    name: string;
  };
};

type ReportUser = {
  id: number;
  name: string;
  email: string;
  jobRole: string | null;
  restaurant: {
    id: number;
    name: string;
  };
};

type RequiredMaterial = {
  id: number;
  positionId: string;
};

type ProgressRow = {
  userId: number;
  materialId: number;
  completedAt: Date | null;
};

type AttemptRow = {
  userId: number;
  score: number;
  passed: boolean;
  createdAt: Date;
  quiz: {
    materialId: number;
  };
};

type EarnedBadgeRow = {
  userId: number;
  earnedAt: Date;
  badge: {
    code: string;
    nameZh: string;
    nameEn: string;
    nameFr: string;
  };
};

const HOLDING_JOB_ROLE = 'holding';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';

function hasJobRole(jobRole: string | null, expectedRole: string): boolean {
  return getRoleValues(jobRole).includes(expectedRole);
}

function isHoldingJobRole(jobRole: string | null): boolean {
  return `${jobRole || ''}`.toLowerCase() === HOLDING_JOB_ROLE;
}

function calculatePercent(total: number, value: number): number {
  if (total === 0) return 100;

  return Math.round((value / total) * 100);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function parseMonthRange(month: string): {
  month: string;
  from: Date;
  to: Date;
} {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException('INVALID_REPORT_MONTH');
  }

  const from = new Date(`${month}-01T00:00:00.000Z`);

  if (Number.isNaN(from.getTime())) {
    throw new BadRequestException('INVALID_REPORT_MONTH');
  }

  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1);

  return { month, from, to };
}

function buildUserMaterialKey(userId: number, materialId: number): string {
  return `${userId}:${materialId}`;
}

@Injectable()
export class TrainingMonthlyReportService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMonthlyReport(
    viewer: ReportViewer,
    monthInput: string | undefined,
    restaurantIdInput: number | undefined,
  ): Promise<TrainingMonthlyReport> {
    if (!this.canViewReports(viewer)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const now = new Date();
    const fallbackMonth = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, '0')}`;
    const range = parseMonthRange(monthInput ?? fallbackMonth);
    const scope = await this.buildScope(viewer, restaurantIdInput);
    const [positions, mappings, materials, users] = await Promise.all([
      this.listActivePositionRows(),
      this.listJobRolePositionRows(),
      this.listRequiredMaterials(),
      this.prismaService.user.findMany({
        where: scope.userWhere,
        select: {
          id: true,
          name: true,
          email: true,
          jobRole: true,
          restaurant: { select: { id: true, name: true } },
        },
        orderBy: [{ restaurantId: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const userIds = users.map((user) => user.id);
    const materialIds = materials.map((material) => material.id);
    const [progressRows, attemptRows, earnedBadgeRows] = await Promise.all([
      this.prismaService.trainingMaterialProgress.findMany({
        where: {
          userId: { in: userIds },
          materialId: { in: materialIds },
          status: 'completed',
        },
        select: { userId: true, materialId: true, completedAt: true },
      }),
      this.prismaService.trainingQuizAttempt.findMany({
        where: {
          userId: { in: userIds },
          createdAt: { gte: range.from, lt: range.to },
        },
        select: {
          userId: true,
          score: true,
          passed: true,
          createdAt: true,
          quiz: { select: { materialId: true } },
        },
      }),
      this.prismaService.userTrainingBadge.findMany({
        where: {
          userId: { in: userIds },
          earnedAt: { gte: range.from, lt: range.to },
        },
        select: {
          userId: true,
          earnedAt: true,
          badge: {
            select: {
              code: true,
              nameZh: true,
              nameEn: true,
              nameFr: true,
            },
          },
        },
      }),
    ]);
    const usersReport = users.map((user) =>
      this.buildUserReport(
        user,
        positions,
        mappings,
        materials,
        progressRows,
        attemptRows,
        earnedBadgeRows,
        range,
      ),
    );
    const stores = this.buildStoreReports(usersReport);
    const summary = this.summarizeUsers(usersReport);

    return {
      month: range.month,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      scope: {
        restaurantId: scope.restaurant.id,
        restaurantName: scope.restaurant.name,
      },
      summary,
      stores,
      users: usersReport,
    };
  }

  private buildUserReport(
    user: ReportUser,
    positions: TrainingPositionResolverPositionRow[],
    mappings: TrainingJobRolePositionRow[],
    materials: RequiredMaterial[],
    progressRows: ProgressRow[],
    attemptRows: AttemptRow[],
    earnedBadgeRows: EarnedBadgeRow[],
    range: { from: Date; to: Date },
  ): TrainingMonthlyReport['users'][number] {
    const positionCodes = resolveTrainingPositionCodes(
      user.jobRole,
      positions,
      mappings,
    ).positionCodes;
    const positionCodeSet = new Set(positionCodes);
    const requiredMaterials = materials.filter((material) =>
      positionCodeSet.has(material.positionId),
    );
    const requiredMaterialIds = new Set(
      requiredMaterials.map((material) => material.id),
    );
    const completedKeys = new Set(
      progressRows.map((row) =>
        buildUserMaterialKey(row.userId, row.materialId),
      ),
    );
    const requiredCompleted = requiredMaterials.filter((material) =>
      completedKeys.has(buildUserMaterialKey(user.id, material.id)),
    ).length;
    const completedThisMonth = progressRows.filter(
      (row) =>
        row.userId === user.id &&
        requiredMaterialIds.has(row.materialId) &&
        row.completedAt !== null &&
        row.completedAt >= range.from &&
        row.completedAt < range.to,
    ).length;
    const userAttempts = attemptRows.filter(
      (attempt) => attempt.userId === user.id,
    );
    const bestScoreByMaterialId = new Map<number, number>();

    for (const attempt of userAttempts) {
      const materialId = attempt.quiz.materialId;
      bestScoreByMaterialId.set(
        materialId,
        Math.max(bestScoreByMaterialId.get(materialId) ?? 0, attempt.score),
      );
    }

    const badges = earnedBadgeRows
      .filter((row) => row.userId === user.id)
      .map((row) => ({
        code: row.badge.code,
        name: {
          zh: row.badge.nameZh,
          en: row.badge.nameEn,
          fr: row.badge.nameFr,
        },
        earnedAt: row.earnedAt.toISOString(),
      }));

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      jobRole: user.jobRole,
      restaurant: user.restaurant,
      requiredTotal: requiredMaterials.length,
      requiredCompleted,
      completionPercent: calculatePercent(
        requiredMaterials.length,
        requiredCompleted,
      ),
      completedThisMonth,
      quizAttemptCount: userAttempts.length,
      quizPassedCount: userAttempts.filter((attempt) => attempt.passed).length,
      quizPassRate: calculatePercent(
        userAttempts.length,
        userAttempts.filter((attempt) => attempt.passed).length,
      ),
      averageBestScore: average([...bestScoreByMaterialId.values()]),
      newBadgeCount: badges.length,
      badges,
    };
  }

  private buildStoreReports(
    users: TrainingMonthlyReport['users'],
  ): TrainingMonthlyReportStoreItem[] {
    const usersByStore = new Map<number, TrainingMonthlyReport['users']>();

    for (const user of users) {
      const current = usersByStore.get(user.restaurant.id) ?? [];
      current.push(user);
      usersByStore.set(user.restaurant.id, current);
    }

    return [...usersByStore.entries()].map(([restaurantId, storeUsers]) => ({
      restaurantId,
      restaurantName: storeUsers[0]?.restaurant.name ?? 'Unknown',
      ...this.summarizeUsers(storeUsers),
    }));
  }

  private summarizeUsers(users: TrainingMonthlyReport['users']): {
    employeeCount: number;
    averageCompletionPercent: number;
    completedEmployeeCount: number;
    completedThisMonth: number;
    quizAttemptCount: number;
    quizPassedCount: number;
    quizPassRate: number;
    averageBestScore: number | null;
    newBadgeCount: number;
  } {
    const quizAttemptCount = users.reduce(
      (sum, user) => sum + user.quizAttemptCount,
      0,
    );
    const quizPassedCount = users.reduce(
      (sum, user) => sum + user.quizPassedCount,
      0,
    );

    return {
      employeeCount: users.length,
      averageCompletionPercent:
        average(users.map((user) => user.completionPercent)) ?? 100,
      completedEmployeeCount: users.filter(
        (user) => user.requiredTotal > 0 && user.completionPercent === 100,
      ).length,
      completedThisMonth: users.reduce(
        (sum, user) => sum + user.completedThisMonth,
        0,
      ),
      quizAttemptCount,
      quizPassedCount,
      quizPassRate: calculatePercent(quizAttemptCount, quizPassedCount),
      averageBestScore: average(
        users
          .map((user) => user.averageBestScore)
          .filter((score): score is number => score !== null),
      ),
      newBadgeCount: users.reduce((sum, user) => sum + user.newBadgeCount, 0),
    };
  }

  private canViewReports(viewer: ReportViewer): boolean {
    return (
      isHoldingJobRole(viewer.jobRole) ||
      hasJobRole(viewer.jobRole, STORE_MANAGER_JOB_ROLE) ||
      hasJobRole(viewer.jobRole, REGIONAL_MANAGER_JOB_ROLE)
    );
  }

  private async buildScope(
    viewer: ReportViewer,
    restaurantId: number | undefined,
  ): Promise<{
    userWhere: Prisma.UserWhereInput;
    restaurant: {
      id: number;
      name: string;
    };
  }> {
    if (isHoldingJobRole(viewer.jobRole)) {
      return this.buildHoldingScope(restaurantId);
    }

    if (hasJobRole(viewer.jobRole, REGIONAL_MANAGER_JOB_ROLE)) {
      return this.buildRegionalScope(viewer.id, restaurantId);
    }

    if (restaurantId !== undefined && restaurantId !== viewer.restaurantId) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    return {
      userWhere: { restaurantId: viewer.restaurantId },
      restaurant: viewer.store,
    };
  }

  private async buildHoldingScope(restaurantId: number | undefined): Promise<{
    userWhere: Prisma.UserWhereInput;
    restaurant: { id: number; name: string };
  }> {
    if (restaurantId !== undefined) {
      const restaurant = await this.prismaService.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true },
      });

      if (!restaurant) {
        throw new BadRequestException('RESTAURANT_NOT_FOUND');
      }

      return {
        userWhere: { restaurantId, jobRole: { not: HOLDING_JOB_ROLE } },
        restaurant,
      };
    }

    return {
      userWhere: { jobRole: { not: HOLDING_JOB_ROLE } },
      restaurant: { id: 0, name: '全部门店' },
    };
  }

  private async buildRegionalScope(
    viewerId: number,
    restaurantId: number | undefined,
  ): Promise<{
    userWhere: Prisma.UserWhereInput;
    restaurant: { id: number; name: string };
  }> {
    const managedRestaurantIds =
      await this.findRegionalManagedRestaurantIds(viewerId);

    if (restaurantId !== undefined) {
      if (!managedRestaurantIds.includes(restaurantId)) {
        throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
      }

      const restaurant = await this.prismaService.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true },
      });

      if (!restaurant) {
        throw new BadRequestException('RESTAURANT_NOT_FOUND');
      }

      return { userWhere: { restaurantId }, restaurant };
    }

    return {
      userWhere: { restaurantId: { in: managedRestaurantIds } },
      restaurant: { id: 0, name: '负责门店' },
    };
  }

  private async findRegionalManagedRestaurantIds(
    viewerId: number,
  ): Promise<number[]> {
    const rows = await this.prismaService.legacyUserManagedRestaurant.findMany({
      where: { userId: viewerId },
      select: { restaurantId: true },
      orderBy: { restaurantId: 'asc' },
    });

    return rows.map((row) => row.restaurantId);
  }

  private async listActivePositionRows(): Promise<
    TrainingPositionResolverPositionRow[]
  > {
    return this.prismaService.trainingPosition.findMany({
      where: { isActive: true },
      select: { code: true, parentCode: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  private async listJobRolePositionRows(): Promise<
    TrainingJobRolePositionRow[]
  > {
    return this.prismaService.trainingJobRolePosition.findMany({
      select: {
        jobRole: true,
        positionCode: true,
        includeDescendants: true,
        grantsAllPositions: true,
      },
      orderBy: [{ jobRole: 'asc' }],
    });
  }

  private async listRequiredMaterials(): Promise<RequiredMaterial[]> {
    return this.prismaService.trainingMaterial.findMany({
      where: { isRequired: true },
      select: { id: true, positionId: true },
      orderBy: [{ id: 'asc' }],
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  TrainingBadgeItem,
  TrainingEmployeeBadgeItem,
  TrainingEmployeeBadgeStatus,
  TrainingMyBadges,
} from './training.types';

type BadgeRequirementRow = {
  materialId: number;
  sortOrder: number;
  material: {
    id: number;
    title: string;
    positionId: string;
    type: string;
    quiz: { id: number } | null;
  };
};

type BadgeRow = {
  code: string;
  nameZh: string;
  nameEn: string;
  nameFr: string;
  descriptionZh: string | null;
  descriptionEn: string | null;
  descriptionFr: string | null;
  track: string;
  rarity: string;
  level: number | null;
  iconType: string;
  requiredScore: number;
  requiredCompletionRate: number;
  isActive: boolean;
  sortOrder: number;
  requirements: BadgeRequirementRow[];
};

type QuizAttemptRow = {
  score: number;
  passed: boolean;
  quiz: {
    materialId: number;
  };
};

type BadgeProgress = {
  item: TrainingEmployeeBadgeItem;
  eligible: boolean;
};

function toBadgeItem(row: BadgeRow): TrainingBadgeItem {
  return {
    code: row.code,
    name: {
      zh: row.nameZh,
      en: row.nameEn,
      fr: row.nameFr,
    },
    description: {
      zh: row.descriptionZh,
      en: row.descriptionEn,
      fr: row.descriptionFr,
    },
    track: row.track,
    rarity: row.rarity,
    level: row.level,
    iconType: row.iconType,
    requiredScore: row.requiredScore,
    requiredCompletionRate: row.requiredCompletionRate,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    requirements: row.requirements.map((requirement) => ({
      materialId: requirement.material.id,
      title: requirement.material.title,
      positionId: requirement.material.positionId,
      type: requirement.material.type,
    })),
  };
}

function calculatePercent(total: number, completed: number): number {
  if (total === 0) return 0;

  return Math.round((completed / total) * 100);
}

function getBadgeStatus(
  earnedAt: Date | null,
  progress: number,
  maxProgress: number,
  score: number | null,
): TrainingEmployeeBadgeStatus {
  if (earnedAt) return 'certified';
  if (progress === 0) return 'locked';
  if (progress >= maxProgress && score !== null) return 'failed';

  return 'in_progress';
}

function buildBestScoreByMaterialId(
  attempts: QuizAttemptRow[],
): Map<number, { bestScore: number; bestPassedScore: number | null }> {
  const scoreByMaterialId = new Map<
    number,
    { bestScore: number; bestPassedScore: number | null }
  >();

  for (const attempt of attempts) {
    const materialId = attempt.quiz.materialId;
    const current = scoreByMaterialId.get(materialId);
    const bestPassedScore = attempt.passed
      ? Math.max(current?.bestPassedScore ?? 0, attempt.score)
      : (current?.bestPassedScore ?? null);

    scoreByMaterialId.set(materialId, {
      bestScore: Math.max(current?.bestScore ?? 0, attempt.score),
      bestPassedScore,
    });
  }

  return scoreByMaterialId;
}

@Injectable()
export class TrainingBadgeService {
  constructor(private readonly prismaService: PrismaService) {}

  async listBadges(): Promise<TrainingBadgeItem[]> {
    const rows = await this.findBadgeRows();

    return rows.map(toBadgeItem);
  }

  async getMyBadges(userId: number): Promise<TrainingMyBadges> {
    const rows = await this.findBadgeRows({ isActive: true });
    const items = await this.buildEmployeeBadges(userId, rows);

    return {
      badges: items,
      earnedCount: items.filter((item) => item.status === 'certified').length,
      totalCount: items.length,
    };
  }

  async updateRequirements(
    badgeCode: string,
    materialIds: number[],
  ): Promise<TrainingBadgeItem> {
    const badge = await this.prismaService.trainingBadge.findUnique({
      where: { code: badgeCode },
      select: { code: true },
    });

    if (!badge) {
      throw new NotFoundException('TRAINING_BADGE_NOT_FOUND');
    }

    const uniqueMaterialIds = [...new Set(materialIds)];

    if (uniqueMaterialIds.length > 0) {
      const materialCount = await this.prismaService.trainingMaterial.count({
        where: { id: { in: uniqueMaterialIds } },
      });

      if (materialCount !== uniqueMaterialIds.length) {
        throw new BadRequestException(
          'TRAINING_BADGE_REQUIREMENT_MATERIAL_NOT_FOUND',
        );
      }
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.trainingBadgeRequirement.deleteMany({
        where: { badgeCode },
      });

      if (uniqueMaterialIds.length > 0) {
        await tx.trainingBadgeRequirement.createMany({
          data: uniqueMaterialIds.map((materialId, index) => ({
            badgeCode,
            materialId,
            sortOrder: index,
          })),
        });
      }
    });

    return this.requireBadge(badgeCode);
  }

  async evaluateForMaterial(
    userId: number,
    materialId: number,
  ): Promise<TrainingEmployeeBadgeItem[]> {
    const rows = await this.findBadgeRows({
      isActive: true,
      requirements: { some: { materialId } },
    });

    if (rows.length === 0) {
      return [];
    }

    return this.grantEligibleBadges(userId, rows);
  }

  private async grantEligibleBadges(
    userId: number,
    rows: BadgeRow[],
  ): Promise<TrainingEmployeeBadgeItem[]> {
    const earnedRows = await this.prismaService.userTrainingBadge.findMany({
      where: {
        userId,
        badgeCode: { in: rows.map((row) => row.code) },
      },
      select: { badgeCode: true },
    });
    const alreadyEarnedCodes = new Set(earnedRows.map((row) => row.badgeCode));
    const progressItems = await this.buildEmployeeBadgeProgress(userId, rows);
    const newBadgeCodes = progressItems
      .filter(
        (progress) =>
          progress.eligible && !alreadyEarnedCodes.has(progress.item.code),
      )
      .map((progress) => progress.item.code);

    if (newBadgeCodes.length === 0) {
      return [];
    }

    const earnedAt = new Date();
    await this.prismaService.userTrainingBadge.createMany({
      data: newBadgeCodes.map((badgeCode) => ({
        userId,
        badgeCode,
        earnedAt,
      })),
      skipDuplicates: true,
    });

    return progressItems
      .filter((progress) => newBadgeCodes.includes(progress.item.code))
      .map((progress) => ({
        ...progress.item,
        status: 'certified',
        earnedAt: earnedAt.toISOString(),
      }));
  }

  private async buildEmployeeBadges(
    userId: number,
    rows: BadgeRow[],
  ): Promise<TrainingEmployeeBadgeItem[]> {
    const earnedRows = await this.prismaService.userTrainingBadge.findMany({
      where: { userId },
      select: { badgeCode: true, earnedAt: true },
    });
    const earnedAtByBadgeCode = new Map(
      earnedRows.map((row) => [row.badgeCode, row.earnedAt]),
    );
    const progressItems = await this.buildEmployeeBadgeProgress(userId, rows);

    return progressItems.map((progress) => {
      const earnedAt = earnedAtByBadgeCode.get(progress.item.code) ?? null;

      return {
        ...progress.item,
        status: getBadgeStatus(
          earnedAt,
          progress.item.progress,
          progress.item.maxProgress,
          progress.item.score,
        ),
        earnedAt: earnedAt ? earnedAt.toISOString() : null,
      };
    });
  }

  private async buildEmployeeBadgeProgress(
    userId: number,
    rows: BadgeRow[],
  ): Promise<BadgeProgress[]> {
    const materialIds = [
      ...new Set(
        rows.flatMap((row) =>
          row.requirements.map((requirement) => requirement.materialId),
        ),
      ),
    ];

    if (materialIds.length === 0) {
      return rows.map((row) => ({
        item: {
          ...toBadgeItem(row),
          status: 'locked',
          progress: 0,
          maxProgress: 0,
          completionRate: 0,
          score: null,
          earnedAt: null,
        },
        eligible: false,
      }));
    }

    const [progressRows, attemptRows] = await Promise.all([
      this.prismaService.trainingMaterialProgress.findMany({
        where: {
          userId,
          materialId: { in: materialIds },
          status: 'completed',
        },
        select: { materialId: true },
      }),
      this.prismaService.trainingQuizAttempt.findMany({
        where: {
          userId,
          quiz: { materialId: { in: materialIds } },
        },
        select: {
          score: true,
          passed: true,
          quiz: { select: { materialId: true } },
        },
      }),
    ]);
    const completedMaterialIds = new Set(
      progressRows.map((row) => row.materialId),
    );
    const scoreByMaterialId = buildBestScoreByMaterialId(attemptRows);

    return rows.map((row) => {
      const maxProgress = row.requirements.length;
      let progress = 0;
      let eligible = maxProgress > 0;
      const scores: number[] = [];

      for (const requirement of row.requirements) {
        const quizStats = scoreByMaterialId.get(requirement.materialId);
        const hasQuiz = Boolean(requirement.material.quiz);
        const completed = completedMaterialIds.has(requirement.materialId);
        const quizPassed =
          !hasQuiz ||
          (quizStats?.bestPassedScore !== null &&
            quizStats?.bestPassedScore !== undefined &&
            quizStats.bestPassedScore >= row.requiredScore);

        if (quizStats) {
          scores.push(quizStats.bestScore);
        }

        if (completed && quizPassed) {
          progress += 1;
          continue;
        }

        eligible = false;
      }

      const completionRate = calculatePercent(maxProgress, progress);
      const score = scores.length > 0 ? Math.max(...scores) : null;

      return {
        item: {
          ...toBadgeItem(row),
          status: getBadgeStatus(null, progress, maxProgress, score),
          progress,
          maxProgress,
          completionRate,
          score,
          earnedAt: null,
        },
        eligible: eligible && completionRate >= row.requiredCompletionRate,
      };
    });
  }

  private async requireBadge(code: string): Promise<TrainingBadgeItem> {
    const rows = await this.findBadgeRows({ code });
    const badge = rows[0];

    if (!badge) {
      throw new NotFoundException('TRAINING_BADGE_NOT_FOUND');
    }

    return toBadgeItem(badge);
  }

  private findBadgeRows(
    where: Prisma.TrainingBadgeWhereInput = {},
  ): Promise<BadgeRow[]> {
    return this.prismaService.trainingBadge.findMany({
      where,
      include: {
        requirements: {
          include: {
            material: {
              select: {
                id: true,
                title: true,
                positionId: true,
                type: true,
                quiz: { select: { id: true } },
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }
}

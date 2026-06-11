import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TrainingMyTitles, TrainingTitleItem } from './training.types';

type TrainingTitleRow = {
  code: string;
  nameZh: string;
  nameEn: string;
  nameFr: string;
  frameStyle: string;
  unlockPositionCode: string;
  sortOrder: number;
};

function toTitleItem(
  row: TrainingTitleRow,
  earnedAt: Date | null,
): TrainingTitleItem {
  return {
    code: row.code,
    name: { zh: row.nameZh, en: row.nameEn, fr: row.nameFr },
    frameStyle: row.frameStyle,
    unlockPositionCode: row.unlockPositionCode,
    earned: earnedAt !== null,
    earnedAt: earnedAt ? earnedAt.toISOString() : null,
  };
}

@Injectable()
export class TrainingTitleService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMyTitles(userId: number): Promise<TrainingMyTitles> {
    const [titles, earnedRows] = await Promise.all([
      this.prismaService.trainingTitle.findMany({
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prismaService.userTrainingTitle.findMany({
        where: { userId },
        select: { titleCode: true, earnedAt: true },
      }),
    ]);
    const earnedAtByCode = new Map(
      earnedRows.map((row) => [row.titleCode, row.earnedAt]),
    );
    const items = titles.map((title) =>
      toTitleItem(title, earnedAtByCode.get(title.code) ?? null),
    );

    return {
      earned: items.filter((item) => item.earned),
      available: items.filter((item) => !item.earned),
    };
  }

  async listEarnedTitles(userId: number): Promise<TrainingTitleItem[]> {
    return (await this.getMyTitles(userId)).earned;
  }

  // Grants any title for `positionCode` whose required materials are now all
  // completed by the user. Returns only the titles newly earned in this call.
  async evaluateForPosition(
    userId: number,
    positionCode: string,
  ): Promise<TrainingTitleItem[]> {
    const titles = await this.prismaService.trainingTitle.findMany({
      where: { unlockPositionCode: positionCode },
    });

    if (titles.length === 0) {
      return [];
    }

    const requiredMaterials =
      await this.prismaService.trainingMaterial.findMany({
        where: { positionId: positionCode, isRequired: true },
        select: { id: true },
      });

    // A position with no required materials cannot be "earned" — that would
    // hand out titles for free.
    if (requiredMaterials.length === 0) {
      return [];
    }

    const completedCount =
      await this.prismaService.trainingMaterialProgress.count({
        where: {
          userId,
          status: 'completed',
          materialId: { in: requiredMaterials.map((material) => material.id) },
        },
      });

    if (completedCount < requiredMaterials.length) {
      return [];
    }

    const alreadyEarned = await this.prismaService.userTrainingTitle.findMany({
      where: {
        userId,
        titleCode: { in: titles.map((title) => title.code) },
      },
      select: { titleCode: true },
    });
    const earnedCodes = new Set(alreadyEarned.map((row) => row.titleCode));
    const newTitleRows = titles.filter((title) => !earnedCodes.has(title.code));

    if (newTitleRows.length === 0) {
      return [];
    }

    const earnedAt = new Date();
    await this.prismaService.userTrainingTitle.createMany({
      data: newTitleRows.map((title) => ({
        userId,
        titleCode: title.code,
        earnedAt,
      })),
      skipDuplicates: true,
    });

    return newTitleRows.map((title) => toTitleItem(title, earnedAt));
  }
}

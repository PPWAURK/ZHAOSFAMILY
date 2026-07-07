import { Injectable, NotFoundException } from '@nestjs/common';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { PrismaService } from '../prisma/prisma.service';
import type {
  TrainingMyTitles,
  TrainingTitleItem,
  TrainingTitleRecipient,
} from './training.types';

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

  async listTitles(): Promise<TrainingTitleItem[]> {
    const titles = await this.prismaService.trainingTitle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return titles.map((title) => toTitleItem(title, null));
  }

  async listRecipients(): Promise<TrainingTitleRecipient[]> {
    const users = await this.prismaService.user.findMany({
      where: {
        accountStatus: {
          notIn: [ACCOUNT_STATUS.removed, ACCOUNT_STATUS.deleted],
        },
      },
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
        trainingTitles: {
          select: {
            earnedAt: true,
            title: true,
          },
          orderBy: [{ earnedAt: 'desc' }],
        },
      },
      orderBy: [{ restaurantId: 'asc' }, { id: 'asc' }],
    });

    return users.map((user) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      accountStatus: user.accountStatus,
      jobRole: user.jobRole,
      restaurant: user.restaurant,
      titles: user.trainingTitles.map((assignment) =>
        toTitleItem(assignment.title, assignment.earnedAt),
      ),
    }));
  }

  async listEarnedTitles(userId: number): Promise<TrainingTitleItem[]> {
    return (await this.getMyTitles(userId)).earned;
  }

  async assignTitleToUser(
    userId: number,
    titleCode: string,
  ): Promise<TrainingTitleItem> {
    const [title, user] = await Promise.all([
      this.prismaService.trainingTitle.findUnique({
        where: { code: titleCode },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!title) {
      throw new NotFoundException('TRAINING_TITLE_NOT_FOUND');
    }

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    const assignment = await this.prismaService.userTrainingTitle.upsert({
      where: {
        userId_titleCode: {
          userId,
          titleCode,
        },
      },
      create: {
        userId,
        titleCode,
      },
      update: {},
      select: { earnedAt: true },
    });

    return toTitleItem(title, assignment.earnedAt);
  }

  async revokeTitleFromUser(
    userId: number,
    titleCode: string,
  ): Promise<{ message: 'TRAINING_TITLE_REVOKED' }> {
    const [title, user] = await Promise.all([
      this.prismaService.trainingTitle.findUnique({
        where: { code: titleCode },
        select: { code: true },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!title) {
      throw new NotFoundException('TRAINING_TITLE_NOT_FOUND');
    }

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }

    await this.prismaService.userTrainingTitle.deleteMany({
      where: {
        userId,
        titleCode,
      },
    });

    return { message: 'TRAINING_TITLE_REVOKED' };
  }
}

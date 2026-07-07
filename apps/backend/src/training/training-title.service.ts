import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTrainingTitleDto } from './dto/create-training-title.dto';
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

function normalizeTitleCodeSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 22);
}

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
    const [titles, earnedRows, user] = await Promise.all([
      this.prismaService.trainingTitle.findMany({
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prismaService.userTrainingTitle.findMany({
        where: { userId },
        select: { titleCode: true, earnedAt: true },
      }),
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: { equippedTrainingTitleCode: true },
      }),
    ]);
    const earnedAtByCode = new Map(
      earnedRows.map((row) => [row.titleCode, row.earnedAt]),
    );
    const items = titles.map((title) =>
      toTitleItem(title, earnedAtByCode.get(title.code) ?? null),
    );
    const equippedTitle =
      items.find(
        (item) => item.earned && item.code === user?.equippedTrainingTitleCode,
      ) ?? null;

    return {
      earned: items.filter((item) => item.earned),
      available: items.filter((item) => !item.earned),
      equippedTitleCode: equippedTitle?.code ?? null,
      equippedTitle,
    };
  }

  async listTitles(): Promise<TrainingTitleItem[]> {
    const titles = await this.prismaService.trainingTitle.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return titles.map((title) => toTitleItem(title, null));
  }

  async createTitle(dto: CreateTrainingTitleDto): Promise<TrainingTitleItem> {
    const code = await this.resolveTitleCode(dto);

    const title = await this.prismaService.trainingTitle.create({
      data: {
        code,
        nameZh: dto.nameZh.trim(),
        nameEn: dto.nameEn.trim(),
        nameFr: dto.nameFr.trim(),
        frameStyle: dto.frameStyle.trim(),
        unlockPositionCode: dto.unlockPositionCode.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return toTitleItem(title, null);
  }

  private async resolveTitleCode(dto: CreateTrainingTitleDto): Promise<string> {
    const requestedCode = dto.code?.trim();

    if (requestedCode) {
      const existing = await this.prismaService.trainingTitle.findUnique({
        where: { code: requestedCode },
        select: { code: true },
      });

      if (existing) {
        throw new ConflictException('TRAINING_TITLE_ALREADY_EXISTS');
      }

      return requestedCode;
    }

    const baseSegment =
      normalizeTitleCodeSegment(dto.nameEn) ||
      normalizeTitleCodeSegment(dto.nameZh) ||
      normalizeTitleCodeSegment(dto.nameFr) ||
      'CUSTOM';
    const baseCode = `TITLE_${baseSegment}`.slice(0, 32);

    for (let index = 0; index < 100; index += 1) {
      const suffix = index === 0 ? '' : `_${index + 1}`;
      const code = `${baseCode}${suffix}`.slice(0, 40);
      const existing = await this.prismaService.trainingTitle.findUnique({
        where: { code },
        select: { code: true },
      });

      if (!existing) return code;
    }

    throw new ConflictException('TRAINING_TITLE_CODE_UNAVAILABLE');
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

  async equipTitleForUser(
    userId: number,
    titleCode: string | null | undefined,
  ): Promise<TrainingMyTitles> {
    const normalizedTitleCode = titleCode?.trim() || null;

    if (!normalizedTitleCode) {
      await this.prismaService.user.update({
        where: { id: userId },
        data: { equippedTrainingTitleCode: null },
        select: { id: true },
      });

      return this.getMyTitles(userId);
    }

    const assignment = await this.prismaService.userTrainingTitle.findUnique({
      where: {
        userId_titleCode: {
          userId,
          titleCode: normalizedTitleCode,
        },
      },
      select: { titleCode: true },
    });

    if (!assignment) {
      throw new NotFoundException('TRAINING_TITLE_NOT_EARNED');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { equippedTrainingTitleCode: normalizedTitleCode },
      select: { id: true },
    });

    return this.getMyTitles(userId);
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
    await this.prismaService.user.updateMany({
      where: {
        id: userId,
        equippedTrainingTitleCode: titleCode,
      },
      data: { equippedTrainingTitleCode: null },
    });

    return { message: 'TRAINING_TITLE_REVOKED' };
  }
}

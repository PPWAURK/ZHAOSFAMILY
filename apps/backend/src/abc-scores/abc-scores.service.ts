import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Restaurant } from '@prisma/client';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AttachMediaDto } from './dto/attach-media.dto';
import type { CreateCycleDto } from './dto/create-cycle.dto';
import type { FillOperationsScoreDto } from './dto/fill-operations-score.dto';
import type { FillScoreDto } from './dto/fill-score.dto';
import type { ListCyclesQueryDto } from './dto/list-cycles-query.dto';
import type {
  AbcCycleDetail,
  AbcCycleStatus,
  AbcCycleSummary,
  AbcGrade,
  AbcLeaderboard,
  AbcProgress,
  AbcScoreActor,
  AbcStoreScoreItem,
} from './abc-scores.types';

type ScoreRecord = Prisma.AbcStoreScoreGetPayload<{ include: { media: true } }>;
type CycleRecord = Prisma.AbcScoreCycleGetPayload<object>;
type ScoreDepartment = 'marketing' | 'operations';

// 控股实体（seed 中的 HOLDING_RESTAURANT）虽然存在 restaurants 表里，
// 但不是真实门店，不参与 ABC 评分。沿用 seed 的约定：按店名识别。
const HOLDING_RESTAURANT_NAME = 'ZHAO Groupe';
const STORE_WHERE: Prisma.RestaurantWhereInput = {
  name: { not: HOLDING_RESTAURANT_NAME },
};

@Injectable()
export class AbcScoresService {
  private readonly logger = new Logger(AbcScoresService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async listCycles(query: ListCyclesQueryDto): Promise<AbcCycleSummary[]> {
    const where: Prisma.AbcScoreCycleWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    const cycles = await this.prismaService.abcScoreCycle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    return cycles.map((cycle) => this.mapCycleSummary(cycle));
  }

  async createCycle(dto: CreateCycleDto): Promise<AbcCycleSummary> {
    const cycle = await this.prismaService.abcScoreCycle.create({
      data: { label: dto.label.trim() },
    });

    return this.mapCycleSummary(cycle);
  }

  async getCycleDetail(cycleId: number): Promise<AbcCycleDetail> {
    const cycle = await this.loadCycle(cycleId);
    const [restaurants, scores] = await Promise.all([
      this.prismaService.restaurant.findMany({
        where: STORE_WHERE,
        orderBy: { id: 'asc' },
      }),
      this.prismaService.abcStoreScore.findMany({
        where: { cycleId },
        include: { media: { orderBy: { createdAt: 'desc' } } },
      }),
    ]);

    const scoreByRestaurant = new Map(
      scores.map((score) => [score.restaurantId, score]),
    );
    const stores = restaurants.map((restaurant) =>
      this.mapStoreScore(restaurant, scoreByRestaurant.get(restaurant.id)),
    );

    return {
      ...this.mapCycleSummary(cycle),
      stores,
      progress: this.buildProgress(restaurants.length, scores),
    };
  }

  async getProgress(cycleId: number): Promise<AbcProgress> {
    await this.loadCycle(cycleId);
    const [total, scores] = await Promise.all([
      this.prismaService.restaurant.count({ where: STORE_WHERE }),
      this.prismaService.abcStoreScore.findMany({
        where: { cycleId },
        select: { marketingScore: true, operationsScore: true },
      }),
    ]);

    return this.buildProgress(total, scores);
  }

  fillMarketingScore(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    dto: FillScoreDto,
  ): Promise<AbcStoreScoreItem> {
    return this.fillScore(actor, cycleId, restaurantId, 'marketing', dto);
  }

  fillOperationsScore(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    dto: FillOperationsScoreDto,
  ): Promise<AbcStoreScoreItem> {
    return this.fillScore(actor, cycleId, restaurantId, 'operations', dto);
  }

  async attachMedia(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    dto: AttachMediaDto,
  ): Promise<AbcStoreScoreItem> {
    await this.assertEditableCycle(cycleId);
    const restaurant = await this.loadRestaurant(restaurantId);
    const storeScore = await this.ensureStoreScore(cycleId, restaurantId);

    await this.prismaService.abcScoreMedia.create({
      data: {
        storeScoreId: storeScore.id,
        objectKey: dto.objectKey.trim(),
        fileName: this.normalizeOptionalText(dto.fileName),
        department: 'operations',
        uploadedByUserId: actor.id,
      },
    });

    return this.mapStoreScore(
      restaurant,
      await this.loadStoreScore(storeScore.id),
    );
  }

  async getLeaderboard(cycleId: number): Promise<AbcLeaderboard> {
    const cycle = await this.loadCycle(cycleId);
    const [restaurants, scores] = await this.loadStoresAndScores(cycleId);

    return this.buildLeaderboard(cycle, restaurants, scores);
  }

  // 首页用：最新已发布周期的排行榜，趋势对照上一个已发布周期。无已发布周期返回 null。
  async getPublishedLeaderboard(): Promise<AbcLeaderboard | null> {
    const published = await this.prismaService.abcScoreCycle.findFirst({
      where: { status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });

    if (!published) {
      return null;
    }

    const previous = await this.prismaService.abcScoreCycle.findFirst({
      where: { status: 'published', id: { not: published.id } },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    });

    const [[restaurants, scores], previousTotals] = await Promise.all([
      this.loadStoresAndScores(published.id),
      previous
        ? this.loadCycleTotals(previous.id)
        : Promise.resolve(new Map<number, number>()),
    ]);

    return this.buildLeaderboard(
      published,
      restaurants,
      scores,
      previousTotals,
    );
  }

  private loadStoresAndScores(
    cycleId: number,
  ): Promise<[Restaurant[], ScoreRecord[]]> {
    return Promise.all([
      this.prismaService.restaurant.findMany({
        where: STORE_WHERE,
        orderBy: { id: 'asc' },
      }),
      this.prismaService.abcStoreScore.findMany({
        where: { cycleId },
        include: { media: { orderBy: { createdAt: 'desc' } } },
      }),
    ]);
  }

  private async loadCycleTotals(cycleId: number): Promise<Map<number, number>> {
    const scores = await this.prismaService.abcStoreScore.findMany({
      where: { cycleId },
      select: {
        restaurantId: true,
        marketingScore: true,
        operationsScore: true,
      },
    });

    return new Map(
      scores.map((score) => [
        score.restaurantId,
        (score.marketingScore ?? 0) + (score.operationsScore ?? 0),
      ]),
    );
  }

  private buildLeaderboard(
    cycle: CycleRecord,
    restaurants: Restaurant[],
    scores: ScoreRecord[],
    previousTotals?: Map<number, number>,
  ): AbcLeaderboard {
    const scoreByRestaurant = new Map(
      scores.map((score) => [score.restaurantId, score]),
    );
    const ranked = restaurants
      .map((restaurant) => {
        const score = scoreByRestaurant.get(restaurant.id);
        const marketingScore = score?.marketingScore ?? null;
        const operationsScore = score?.operationsScore ?? null;
        const totalScore = (marketingScore ?? 0) + (operationsScore ?? 0);
        const previousTotal = previousTotals?.get(restaurant.id);

        return {
          restaurantId: restaurant.id,
          storeName: restaurant.name,
          storeAddress: restaurant.address,
          photoUrl: restaurant.photoUrl ?? null,
          marketingScore,
          operationsScore,
          totalScore,
          grade: (score?.grade as AbcGrade | undefined) ?? null,
          trend:
            previousTotal === undefined ? null : totalScore - previousTotal,
          focus: score?.operationsNotes ?? null,
          auditDate: score?.operationsFilledAt?.toISOString() ?? null,
          reportObjectKey: score?.media?.[0]?.objectKey ?? null,
        };
      })
      .sort(
        (a, b) =>
          b.totalScore - a.totalScore || a.storeName.localeCompare(b.storeName),
      );

    return {
      cycle: this.mapCycleSummary(cycle),
      entries: ranked.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    };
  }

  async publishCycle(cycleId: number): Promise<AbcCycleSummary> {
    const cycle = await this.loadCycle(cycleId);

    if (cycle.status === 'published') {
      return this.mapCycleSummary(cycle);
    }

    const published = await this.prismaService.abcScoreCycle.update({
      where: { id: cycleId },
      data: { status: 'published', publishedAt: new Date() },
    });

    return this.mapCycleSummary(published);
  }

  // 删除整个周期（含已发布）。分数与报告记录通过外键级联一并删除，
  // 报告文件本体在删库后尽力从存储清理（失败不影响删除结果）。
  async deleteCycle(cycleId: number): Promise<{ id: number }> {
    await this.loadCycle(cycleId);

    const media = await this.prismaService.abcScoreMedia.findMany({
      where: { storeScore: { cycleId } },
      select: { objectKey: true },
    });

    await this.prismaService.abcScoreCycle.delete({ where: { id: cycleId } });
    await this.deleteMediaObjects(media.map((item) => item.objectKey));

    return { id: cycleId };
  }

  private async deleteMediaObjects(objectKeys: string[]): Promise<void> {
    await Promise.all(
      objectKeys.map(async (objectKey) => {
        try {
          await this.mediaService.deleteFile(objectKey);
        } catch (error) {
          this.logger.warn(
            `Failed to delete ABC report object ${objectKey}: ${String(error)}`,
          );
        }
      }),
    );
  }

  private async fillScore(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    department: ScoreDepartment,
    dto: FillScoreDto | FillOperationsScoreDto,
  ): Promise<AbcStoreScoreItem> {
    await this.assertEditableCycle(cycleId);
    const restaurant = await this.loadRestaurant(restaurantId);
    const notes = this.normalizeOptionalText(dto.notes);
    const filledAt = new Date();
    const data =
      department === 'marketing'
        ? {
            marketingScore: dto.score,
            marketingNotes: notes,
            marketingFilledByUserId: actor.id,
            marketingFilledAt: filledAt,
          }
        : {
            operationsScore: dto.score,
            operationsNotes: notes,
            operationsFilledByUserId: actor.id,
            operationsFilledAt: filledAt,
            grade: (dto as FillOperationsScoreDto).grade ?? null,
          };

    const score = await this.prismaService.abcStoreScore.upsert({
      where: { cycleId_restaurantId: { cycleId, restaurantId } },
      create: { cycleId, restaurantId, ...data },
      update: data,
      include: { media: { orderBy: { createdAt: 'desc' } } },
    });

    return this.mapStoreScore(restaurant, score);
  }

  private async ensureStoreScore(
    cycleId: number,
    restaurantId: number,
  ): Promise<{ id: number }> {
    return this.prismaService.abcStoreScore.upsert({
      where: { cycleId_restaurantId: { cycleId, restaurantId } },
      create: { cycleId, restaurantId },
      update: {},
      select: { id: true },
    });
  }

  private buildProgress(
    total: number,
    scores: Pick<ScoreRecord, 'marketingScore' | 'operationsScore'>[],
  ): AbcProgress {
    return {
      marketing: {
        filled: scores.filter((score) => score.marketingScore !== null).length,
        total,
      },
      operations: {
        filled: scores.filter((score) => score.operationsScore !== null).length,
        total,
      },
    };
  }

  private async assertEditableCycle(cycleId: number): Promise<void> {
    const cycle = await this.loadCycle(cycleId);

    if (cycle.status !== 'draft') {
      throw new ForbiddenException('ABC_CYCLE_NOT_EDITABLE');
    }
  }

  private async loadCycle(cycleId: number): Promise<CycleRecord> {
    const cycle = await this.prismaService.abcScoreCycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      throw new NotFoundException('ABC_CYCLE_NOT_FOUND');
    }

    return cycle;
  }

  private async loadRestaurant(restaurantId: number): Promise<Restaurant> {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
    });

    // 控股实体不是门店，不接受评分 —— 与 STORE_WHERE 过滤保持一致。
    if (!restaurant || restaurant.name === HOLDING_RESTAURANT_NAME) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }

    return restaurant;
  }

  private async loadStoreScore(storeScoreId: number): Promise<ScoreRecord> {
    return this.prismaService.abcStoreScore.findUniqueOrThrow({
      where: { id: storeScoreId },
      include: { media: { orderBy: { createdAt: 'desc' } } },
    });
  }

  private mapCycleSummary(cycle: CycleRecord): AbcCycleSummary {
    return {
      id: cycle.id,
      label: cycle.label,
      status: cycle.status as AbcCycleStatus,
      publishedAt: cycle.publishedAt?.toISOString() ?? null,
      createdAt: cycle.createdAt.toISOString(),
    };
  }

  private mapStoreScore(
    restaurant: Restaurant,
    score: ScoreRecord | undefined,
  ): AbcStoreScoreItem {
    return {
      restaurantId: restaurant.id,
      storeName: restaurant.name,
      storeAddress: restaurant.address,
      photoUrl: restaurant.photoUrl ?? null,
      marketingScore: score?.marketingScore ?? null,
      marketingNotes: score?.marketingNotes ?? null,
      marketingFilledAt: score?.marketingFilledAt?.toISOString() ?? null,
      operationsScore: score?.operationsScore ?? null,
      operationsNotes: score?.operationsNotes ?? null,
      operationsFilledAt: score?.operationsFilledAt?.toISOString() ?? null,
      grade: (score?.grade as AbcGrade | undefined) ?? null,
      media: (score?.media ?? []).map((item) => ({
        id: item.id,
        objectKey: item.objectKey,
        fileName: item.fileName ?? null,
        department: item.department,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }
}

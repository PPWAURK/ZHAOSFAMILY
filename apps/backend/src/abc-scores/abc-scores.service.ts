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
import type { RecordInspectionDto } from './dto/fill-operations-score.dto';
import type { ListCyclesQueryDto } from './dto/list-cycles-query.dto';
import type {
  AbcCycleDetail,
  AbcCycleStatus,
  AbcCycleSummary,
  AbcGrade,
  AbcGradeDirectory,
  AbcInspectionProgress,
  AbcPublicGradeBoard,
  AbcScoreActor,
  AbcStoreInspectionItem,
} from './abc-scores.types';

type InspectionRecord = Prisma.AbcStoreInspectionGetPayload<{
  include: { media: true };
}>;
type CycleRecord = Prisma.AbcScoreCycleGetPayload<object>;

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
    const cycles = await this.prismaService.abcScoreCycle.findMany({
      where: query.status ? { status: query.status } : undefined,
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
    const [restaurants, inspections] =
      await this.loadStoresAndInspections(cycleId);
    const inspectionByRestaurant = new Map(
      inspections.map((inspection) => [inspection.restaurantId, inspection]),
    );

    return {
      ...this.mapCycleSummary(cycle),
      stores: restaurants.map((restaurant) =>
        this.mapStoreInspection(
          restaurant,
          inspectionByRestaurant.get(restaurant.id),
        ),
      ),
      progress: this.buildProgress(restaurants.length, inspections),
    };
  }

  async getProgress(cycleId: number): Promise<AbcInspectionProgress> {
    await this.loadCycle(cycleId);
    const [total, inspections] = await Promise.all([
      this.prismaService.restaurant.count({ where: STORE_WHERE }),
      this.prismaService.abcStoreInspection.findMany({
        where: { cycleId },
        select: { grade: true },
      }),
    ]);

    return this.buildProgress(total, inspections);
  }

  async recordInspection(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    dto: RecordInspectionDto,
  ): Promise<AbcStoreInspectionItem> {
    await this.assertEditableCycle(cycleId);
    const restaurant = await this.loadRestaurant(restaurantId);
    const inspectedAt = new Date();
    const data = {
      grade: dto.grade,
      inspectionNotes: this.normalizeOptionalText(dto.notes),
      inspectedByUserId: actor.id,
      inspectedAt,
    };
    const inspection = await this.prismaService.abcStoreInspection.upsert({
      where: { cycleId_restaurantId: { cycleId, restaurantId } },
      create: { cycleId, restaurantId, ...data },
      update: data,
      include: { media: { orderBy: { createdAt: 'desc' } } },
    });

    return this.mapStoreInspection(restaurant, inspection);
  }

  async attachMedia(
    actor: AbcScoreActor,
    cycleId: number,
    restaurantId: number,
    dto: AttachMediaDto,
  ): Promise<AbcStoreInspectionItem> {
    await this.assertEditableCycle(cycleId);
    const restaurant = await this.loadRestaurant(restaurantId);
    const inspection = await this.ensureInspection(cycleId, restaurantId);

    await this.prismaService.abcInspectionMedia.create({
      data: {
        storeScoreId: inspection.id,
        objectKey: dto.objectKey.trim(),
        fileName: this.normalizeOptionalText(dto.fileName),
        uploadedByUserId: actor.id,
      },
    });

    return this.mapStoreInspection(
      restaurant,
      await this.loadInspection(inspection.id),
    );
  }

  async getGradeDirectory(cycleId: number): Promise<AbcGradeDirectory> {
    const cycle = await this.loadCycle(cycleId);
    const [restaurants, inspections] =
      await this.loadStoresAndInspections(cycleId);
    const inspectionByRestaurant = new Map(
      inspections.map((inspection) => [inspection.restaurantId, inspection]),
    );

    return {
      cycle: this.mapCycleSummary(cycle),
      entries: restaurants.map((restaurant) => {
        const inspection = inspectionByRestaurant.get(restaurant.id);

        return {
          restaurantId: restaurant.id,
          storeName: restaurant.name,
          storeAddress: restaurant.address,
          photoUrl: restaurant.photoUrl ?? null,
          grade: (inspection?.grade as AbcGrade | undefined) ?? null,
          inspectionNotes: inspection?.inspectionNotes ?? null,
          inspectedAt: inspection?.inspectedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async listPublishedGradeCycles(): Promise<AbcCycleSummary[]> {
    const cycles = await this.prismaService.abcScoreCycle.findMany({
      where: { status: 'published' },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 24,
    });

    return cycles.map((cycle) => this.mapCycleSummary(cycle));
  }

  async getPublishedGradeBoard(
    cycleId?: number,
  ): Promise<AbcPublicGradeBoard | null> {
    const cycle = await this.prismaService.abcScoreCycle.findFirst({
      where: cycleId
        ? { id: cycleId, status: 'published' }
        : { status: 'published' },
      orderBy: cycleId ? undefined : [{ publishedAt: 'desc' }, { id: 'desc' }],
    });

    if (!cycle) {
      return null;
    }

    const directory = await this.getGradeDirectory(cycle.id);

    return {
      cycle: directory.cycle,
      entries: directory.entries.flatMap((entry) => {
        if (!entry.grade) {
          return [];
        }

        return [
          {
            restaurantId: entry.restaurantId,
            storeName: entry.storeName,
            storeAddress: entry.storeAddress,
            photoUrl: entry.photoUrl,
            grade: entry.grade,
          },
        ];
      }),
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

  async deleteCycle(cycleId: number): Promise<{ id: number }> {
    await this.loadCycle(cycleId);
    const media = await this.prismaService.abcInspectionMedia.findMany({
      where: { inspection: { cycleId } },
      select: { objectKey: true },
    });

    await this.prismaService.abcScoreCycle.delete({ where: { id: cycleId } });
    await this.deleteMediaObjects(media.map((item) => item.objectKey));

    return { id: cycleId };
  }

  private loadStoresAndInspections(
    cycleId: number,
  ): Promise<[Restaurant[], InspectionRecord[]]> {
    return Promise.all([
      this.prismaService.restaurant.findMany({
        where: STORE_WHERE,
        orderBy: { id: 'asc' },
      }),
      this.prismaService.abcStoreInspection.findMany({
        where: { cycleId },
        include: { media: { orderBy: { createdAt: 'desc' } } },
      }),
    ]);
  }

  private buildProgress(
    total: number,
    inspections: Array<{ grade: string | null }>,
  ): AbcInspectionProgress {
    return {
      filled: inspections.filter((inspection) => inspection.grade !== null)
        .length,
      total,
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

    if (!restaurant || restaurant.name === HOLDING_RESTAURANT_NAME) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }

    return restaurant;
  }

  private ensureInspection(
    cycleId: number,
    restaurantId: number,
  ): Promise<{ id: number }> {
    return this.prismaService.abcStoreInspection.upsert({
      where: { cycleId_restaurantId: { cycleId, restaurantId } },
      create: { cycleId, restaurantId },
      update: {},
      select: { id: true },
    });
  }

  private loadInspection(inspectionId: number): Promise<InspectionRecord> {
    return this.prismaService.abcStoreInspection.findUniqueOrThrow({
      where: { id: inspectionId },
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

  private mapStoreInspection(
    restaurant: Restaurant,
    inspection: InspectionRecord | undefined,
  ): AbcStoreInspectionItem {
    return {
      restaurantId: restaurant.id,
      storeName: restaurant.name,
      storeAddress: restaurant.address,
      photoUrl: restaurant.photoUrl ?? null,
      grade: (inspection?.grade as AbcGrade | undefined) ?? null,
      inspectionNotes: inspection?.inspectionNotes ?? null,
      inspectedAt: inspection?.inspectedAt?.toISOString() ?? null,
      media: (inspection?.media ?? []).map((item) => ({
        id: item.id,
        objectKey: item.objectKey,
        fileName: item.fileName ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  private async deleteMediaObjects(objectKeys: string[]): Promise<void> {
    await Promise.all(
      objectKeys.map(async (objectKey) => {
        try {
          await this.mediaService.deleteFile(objectKey);
        } catch (error) {
          this.logger.warn(
            `Failed to delete ABC inspection report ${objectKey}: ${String(error)}`,
          );
        }
      }),
    );
  }
}

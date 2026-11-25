import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InventoryMovement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMovementDto } from './dto/create-movement.dto';
import { fixMojibake } from './inventory-text';
import type {
  InventoryLineItem,
  InventoryMovementItem,
} from './inventory.types';

export type {
  InventoryLineItem,
  InventoryMovementItem,
} from './inventory.types';

const PARIS_TIME_ZONE = 'Europe/Paris';
const DEFAULT_MOVEMENTS_LIMIT = 50;

type ProductNames = { nameCn: string; designationFr: string | null };

/** Today's date in Paris as YYYY-MM-DD. */
export function getParisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PARIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * A back-dated business day is stored at 12:00 UTC so it stays on the same
 * calendar day in Paris (UTC+1/+2) and inside that day's month range.
 */
export function resolveOccurredAt(
  occurredOn: string | undefined,
  now: Date = new Date(),
): Date {
  if (!occurredOn) return now;
  if (occurredOn > getParisToday(now)) {
    throw new BadRequestException('OCCURRED_ON_IN_FUTURE');
  }
  const date = new Date(`${occurredOn}T12:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== occurredOn
  ) {
    throw new BadRequestException('OCCURRED_ON_INVALID');
  }
  return date;
}

function toMovementItem(
  row: InventoryMovement,
  product: ProductNames | null,
): InventoryMovementItem {
  return {
    id: row.id.toString(),
    productId: row.productId.toString(),
    productNameCn: fixMojibake(product?.nameCn ?? ''),
    productDesignationFr: fixMojibake(product?.designationFr ?? null),
    delta: row.delta,
    reason: fixMojibake(row.reason),
    source: row.source,
    sourceId: row.sourceId,
    userId: row.userId,
    restaurantId: row.restaurantId,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async listInventoryForSupplier(
    supplierId: number,
  ): Promise<InventoryLineItem[]> {
    const products = await this.prismaService.product.findMany({
      where: { supplierId },
      select: {
        id: true,
        supplierId: true,
        reference: true,
        category: true,
        nameCn: true,
        designationFr: true,
        image: true,
        unit: true,
        specification: true,
      },
      orderBy: { id: 'asc' },
    });

    if (products.length === 0) return [];

    const grouped = await this.prismaService.inventoryMovement.groupBy({
      by: ['productId'],
      where: { productId: { in: products.map((p) => p.id) } },
      _sum: { delta: true },
    });

    const stockMap = new Map<string, number>();
    for (const g of grouped) {
      stockMap.set(g.productId.toString(), g._sum.delta ?? 0);
    }

    return products.map((p) => ({
      id: p.id.toString(),
      supplierId: p.supplierId,
      reference: fixMojibake(p.reference),
      category: fixMojibake(p.category),
      nameCn: fixMojibake(p.nameCn),
      designationFr: fixMojibake(p.designationFr),
      image: p.image,
      unit: fixMojibake(p.unit),
      specification: fixMojibake(p.specification),
      stock: stockMap.get(p.id.toString()) ?? 0,
    }));
  }

  async listMovements(options: {
    productId?: number;
    supplierId?: number;
    limit?: number;
  }): Promise<InventoryMovementItem[]> {
    const where: Record<string, unknown> = {};
    if (options.productId !== undefined) {
      where.productId = BigInt(options.productId);
    }
    if (options.supplierId !== undefined) {
      where.product = { supplierId: options.supplierId };
    }

    const rows = await this.prismaService.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { nameCn: true, designationFr: true } },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: options.limit ?? DEFAULT_MOVEMENTS_LIMIT,
    });

    return rows.map((row) => toMovementItem(row, row.product));
  }

  async createMovement(
    dto: CreateMovementDto,
    actorUserId: number,
  ): Promise<InventoryMovementItem> {
    if (dto.delta === 0) {
      throw new BadRequestException('DELTA_MUST_BE_NON_ZERO');
    }
    if (dto.restaurantId !== undefined && dto.delta > 0) {
      throw new BadRequestException('RESTAURANT_ONLY_FOR_OUTBOUND');
    }
    const occurredAt = resolveOccurredAt(dto.occurredOn);

    const productId = BigInt(dto.productId);
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      select: { id: true, nameCn: true, designationFr: true },
    });
    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    await this.assertRestaurantExists(dto.restaurantId);

    const created = await this.prismaService.inventoryMovement.create({
      data: {
        productId,
        delta: dto.delta,
        reason: dto.reason?.trim() || null,
        source: dto.source ?? 'manual',
        sourceId: dto.sourceId ?? null,
        userId: actorUserId,
        restaurantId: dto.restaurantId ?? null,
        occurredAt,
      },
    });

    return toMovementItem(created, product);
  }

  private async assertRestaurantExists(
    restaurantId: number | undefined,
  ): Promise<void> {
    if (restaurantId === undefined) return;
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }
  }
}

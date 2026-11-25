import { Injectable } from '@nestjs/common';
import { createPlatformMonthRange } from '../analytics/platform-month-range';
import { PrismaService } from '../prisma/prisma.service';
import { fixMojibake } from './inventory-text';
import type {
  InventoryRecordItem,
  InventoryRecordsResult,
} from './inventory.types';

export type ListRecordsOptions = {
  month?: string;
  supplierIds: number[];
  restaurantId?: number;
};

type DateRange = { gte: Date; lt: Date };
type NameLookup = Map<number, string>;

const MANUAL_SOURCE = 'manual';

const PRODUCT_SELECT = {
  supplierId: true,
  reference: true,
  nameCn: true,
  designationFr: true,
  specification: true,
  unit: true,
} as const;

function byDateThenType(
  a: InventoryRecordItem,
  b: InventoryRecordItem,
): number {
  return a.date.localeCompare(b.date) || a.type.localeCompare(b.type);
}

function collectIds(values: (number | null)[]): number[] {
  return [...new Set(values.filter((v): v is number => v !== null))];
}

@Injectable()
export class InventoryRecordsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * One month of bureau activity: manual inbound/outbound movements plus
   * store purchase-order lines. Order-generated stock movements are left out
   * so each order is counted once (as a store_order line).
   */
  async listMonthlyRecords(
    options: ListRecordsOptions,
  ): Promise<InventoryRecordsResult> {
    const range = createPlatformMonthRange(options.month);
    const dateRange = { gte: range.startsAt, lt: range.endsAt };

    const [movements, orderItems] = await Promise.all([
      this.findManualMovements(options, dateRange),
      this.findStoreOrderItems(options, dateRange),
    ]);

    const [users, restaurants] = await Promise.all([
      this.lookupUserNames(
        collectIds([
          ...movements.map((m) => m.userId),
          ...orderItems.map((i) => i.purchaseOrder.createdByUserId),
        ]),
      ),
      this.lookupRestaurantNames(
        collectIds([
          ...movements.map((m) => m.restaurantId),
          ...orderItems.map((i) => i.purchaseOrder.restaurantId),
        ]),
      ),
    ]);

    const records = [
      ...movements.map((m) => this.toMovementRecord(m, users, restaurants)),
      ...orderItems.map((i) => this.toOrderRecord(i, users, restaurants)),
    ].sort(byDateThenType);

    return { month: range.month, records };
  }

  private findManualMovements(options: ListRecordsOptions, range: DateRange) {
    return this.prismaService.inventoryMovement.findMany({
      where: {
        source: MANUAL_SOURCE,
        occurredAt: range,
        product: { supplierId: { in: options.supplierIds } },
        ...(options.restaurantId !== undefined
          ? { restaurantId: options.restaurantId }
          : {}),
      },
      include: { product: { select: PRODUCT_SELECT } },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
  }

  private findStoreOrderItems(options: ListRecordsOptions, range: DateRange) {
    return this.prismaService.purchaseOrderItem.findMany({
      where: {
        supplierId: { in: options.supplierIds },
        quantity: { gt: 0 },
        purchaseOrder: {
          createdAt: range,
          ...(options.restaurantId !== undefined
            ? { restaurantId: options.restaurantId }
            : {}),
        },
      },
      include: {
        purchaseOrder: {
          select: {
            number: true,
            createdAt: true,
            deliveryDate: true,
            restaurantId: true,
            createdByUserId: true,
          },
        },
        product: { select: { reference: true } },
      },
      orderBy: [{ purchaseOrderId: 'asc' }, { id: 'asc' }],
    });
  }

  private toMovementRecord(
    m: Awaited<
      ReturnType<InventoryRecordsService['findManualMovements']>
    >[number],
    users: NameLookup,
    restaurants: NameLookup,
  ): InventoryRecordItem {
    return {
      id: `mv-${m.id.toString()}`,
      type: m.delta > 0 ? 'in' : 'out',
      date: m.occurredAt.toISOString(),
      supplierId: m.product.supplierId,
      productId: m.productId.toString(),
      productReference: fixMojibake(m.product.reference),
      productNameCn: fixMojibake(m.product.nameCn),
      productDesignationFr: fixMojibake(m.product.designationFr),
      specification: fixMojibake(m.product.specification),
      unit: fixMojibake(m.product.unit),
      quantity: Math.abs(m.delta),
      restaurantId: m.restaurantId,
      restaurantName:
        m.restaurantId !== null
          ? (restaurants.get(m.restaurantId) ?? null)
          : null,
      orderNumber: null,
      deliveryDate: null,
      unitPriceHt: null,
      lineTotal: null,
      handlerName: m.userId !== null ? (users.get(m.userId) ?? null) : null,
      note: fixMojibake(m.reason),
    };
  }

  private toOrderRecord(
    i: Awaited<
      ReturnType<InventoryRecordsService['findStoreOrderItems']>
    >[number],
    users: NameLookup,
    restaurants: NameLookup,
  ): InventoryRecordItem {
    const order = i.purchaseOrder;
    return {
      id: `po-${i.id}`,
      type: 'store_order',
      date: order.createdAt.toISOString(),
      supplierId: i.supplierId,
      productId: i.productId.toString(),
      productReference: fixMojibake(i.product.reference),
      productNameCn: fixMojibake(i.nameZh),
      productDesignationFr: fixMojibake(i.nameFr),
      specification: fixMojibake(i.specification),
      unit: fixMojibake(i.unit),
      quantity: i.quantity,
      restaurantId: order.restaurantId,
      restaurantName: restaurants.get(order.restaurantId) ?? null,
      orderNumber: order.number,
      deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
      unitPriceHt: i.unitPriceHt.toFixed(2),
      lineTotal: i.lineTotal.toFixed(2),
      handlerName:
        order.createdByUserId !== null
          ? (users.get(order.createdByUserId) ?? null)
          : null,
      note: null,
    };
  }

  private async lookupUserNames(ids: number[]): Promise<NameLookup> {
    if (ids.length === 0) return new Map();
    const users = await this.prismaService.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(users.map((u) => [u.id, u.name]));
  }

  private async lookupRestaurantNames(ids: number[]): Promise<NameLookup> {
    if (ids.length === 0) return new Map();
    const restaurants = await this.prismaService.restaurant.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(restaurants.map((r) => [r.id, r.name]));
  }
}

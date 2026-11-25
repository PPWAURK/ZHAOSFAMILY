import { Prisma } from '@prisma/client';
import { InventoryRecordsService } from './inventory-records.service';
import type { PrismaService } from '../prisma/prisma.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;

const PRODUCT = {
  supplierId: 8,
  reference: 'B-01',
  nameCn: '纸袋',
  designationFr: 'Sac papier',
  specification: '50 pcs',
  unit: 'carton',
};

function buildService() {
  const prisma = {
    inventoryMovement: { findMany: jest.fn() as AsyncMock },
    purchaseOrderItem: { findMany: jest.fn() as AsyncMock },
    user: { findMany: jest.fn() as AsyncMock },
    restaurant: { findMany: jest.fn() as AsyncMock },
  };
  const service = new InventoryRecordsService(
    prisma as unknown as PrismaService,
  );
  return { prisma, service };
}

function movement(id: bigint, delta: number, day: string, extra = {}) {
  return {
    id,
    productId: 5n,
    delta,
    reason: null,
    userId: 42,
    restaurantId: null,
    occurredAt: new Date(`${day}T12:00:00.000Z`),
    product: PRODUCT,
    ...extra,
  };
}

function orderItem() {
  return {
    id: 77,
    productId: 5n,
    supplierId: 8,
    quantity: 6,
    unitPriceHt: new Prisma.Decimal('1.5'),
    lineTotal: new Prisma.Decimal('9'),
    nameZh: '纸袋',
    nameFr: 'Sac papier',
    specification: '50 pcs',
    unit: 'carton',
    product: { reference: 'B-01' },
    purchaseOrder: {
      number: 'PO-2026-0001',
      createdAt: new Date('2026-11-10T08:00:00.000Z'),
      deliveryDate: new Date('2026-11-12T00:00:00.000Z'),
      restaurantId: 3,
      createdByUserId: 51,
    },
  };
}

describe('InventoryRecordsService.listMonthlyRecords', () => {
  it('merges manual movements and store order lines for the Paris month', async () => {
    const { prisma, service } = buildService();
    prisma.inventoryMovement.findMany.mockResolvedValue([
      movement(1n, 20, '2026-11-02'),
      movement(2n, -4, '2026-11-15', { restaurantId: 3, reason: 'Dépannage' }),
    ]);
    prisma.purchaseOrderItem.findMany.mockResolvedValue([orderItem()]);
    prisma.user.findMany.mockResolvedValue([
      { id: 42, name: 'Bureau Admin' },
      { id: 51, name: 'Chef Store 3' },
    ]);
    prisma.restaurant.findMany.mockResolvedValue([
      { id: 3, name: 'ZHAO Opéra' },
    ]);

    const result = await service.listMonthlyRecords({
      month: '2026-11',
      supplierIds: [8, 6],
    });

    expect(result.month).toBe('2026-11');
    expect(result.records.map((r) => [r.type, r.quantity])).toEqual([
      ['in', 20],
      ['store_order', 6],
      ['out', 4],
    ]);
    expect(result.records[1]).toMatchObject({
      restaurantName: 'ZHAO Opéra',
      orderNumber: 'PO-2026-0001',
      deliveryDate: '2026-11-12',
      unitPriceHt: '1.50',
      lineTotal: '9.00',
      handlerName: 'Chef Store 3',
    });
    expect(result.records[2]).toMatchObject({
      restaurantName: 'ZHAO Opéra',
      handlerName: 'Bureau Admin',
      note: 'Dépannage',
    });

    const movementWhere = prisma.inventoryMovement.findMany.mock
      .calls[0][0] as {
      where: { source: string; occurredAt: { gte: Date; lt: Date } };
    };
    expect(movementWhere.where.source).toBe('manual');
    // November in Paris starts at 23:00 UTC on Oct 31 (UTC+1).
    expect(movementWhere.where.occurredAt.gte.toISOString()).toBe(
      '2026-10-31T23:00:00.000Z',
    );
    expect(movementWhere.where.occurredAt.lt.toISOString()).toBe(
      '2026-11-30T23:00:00.000Z',
    );
  });

  it('filters both sources by store when a restaurant is given', async () => {
    const { prisma, service } = buildService();
    prisma.inventoryMovement.findMany.mockResolvedValue([]);
    prisma.purchaseOrderItem.findMany.mockResolvedValue([]);

    const result = await service.listMonthlyRecords({
      month: '2026-11',
      supplierIds: [8],
      restaurantId: 3,
    });

    expect(result.records).toEqual([]);
    const movementArgs = prisma.inventoryMovement.findMany.mock.calls[0][0] as {
      where: { restaurantId?: number };
    };
    const orderArgs = prisma.purchaseOrderItem.findMany.mock.calls[0][0] as {
      where: { purchaseOrder: { restaurantId?: number } };
    };
    expect(movementArgs.where.restaurantId).toBe(3);
    expect(orderArgs.where.purchaseOrder.restaurantId).toBe(3);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('rejects a malformed month', async () => {
    const { service } = buildService();
    await expect(
      service.listMonthlyRecords({ month: '2026-13', supplierIds: [8] }),
    ).rejects.toThrow('MONTH_INVALID');
  });
});

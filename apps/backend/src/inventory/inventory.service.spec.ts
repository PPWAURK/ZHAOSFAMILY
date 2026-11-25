import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  getParisToday,
  InventoryService,
  resolveOccurredAt,
} from './inventory.service';
import type { PrismaService } from '../prisma/prisma.service';

type AsyncMock = jest.Mock<Promise<unknown>, unknown[]>;

function buildService() {
  const prisma = {
    product: { findUnique: jest.fn() as AsyncMock },
    restaurant: { findUnique: jest.fn() as AsyncMock },
    inventoryMovement: { create: jest.fn() as AsyncMock },
  };
  const service = new InventoryService(prisma as unknown as PrismaService);
  return { prisma, service };
}

function createdRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10n,
    productId: 5n,
    delta: -3,
    reason: 'Livraison',
    source: 'manual',
    sourceId: null,
    userId: 42,
    restaurantId: 7,
    occurredAt: new Date('2026-11-03T12:00:00.000Z'),
    createdAt: new Date('2026-11-25T09:00:00.000Z'),
    ...overrides,
  };
}

describe('resolveOccurredAt', () => {
  const now = new Date('2026-11-25T10:00:00.000Z');

  it('uses the current instant when no business date is given', () => {
    expect(resolveOccurredAt(undefined, now)).toBe(now);
  });

  it('stores a back-dated day at 12:00 UTC so it stays on that Paris day', () => {
    expect(resolveOccurredAt('2026-10-31', now).toISOString()).toBe(
      '2026-10-31T12:00:00.000Z',
    );
  });

  it('rejects a date in the future', () => {
    expect(() => resolveOccurredAt('2026-11-26', now)).toThrow(
      'OCCURRED_ON_IN_FUTURE',
    );
  });

  it('rejects an impossible calendar date', () => {
    expect(() => resolveOccurredAt('2026-02-30', now)).toThrow(
      'OCCURRED_ON_INVALID',
    );
  });

  it('computes today in Paris, not UTC', () => {
    expect(getParisToday(new Date('2026-11-25T23:30:00.000Z'))).toBe(
      '2026-11-26',
    );
  });
});

describe('InventoryService.createMovement', () => {
  it('records the actor, destination store and business date', async () => {
    const { prisma, service } = buildService();
    prisma.product.findUnique.mockResolvedValue({
      id: 5n,
      nameCn: '纸袋',
      designationFr: 'Sac papier',
    });
    prisma.restaurant.findUnique.mockResolvedValue({ id: 7 });
    prisma.inventoryMovement.create.mockResolvedValue(createdRow());

    const result = await service.createMovement(
      {
        productId: 5,
        delta: -3,
        reason: ' Livraison ',
        restaurantId: 7,
        occurredOn: '2026-11-03',
      },
      42,
    );

    const createArgs = prisma.inventoryMovement.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(createArgs.data).toMatchObject({
      productId: 5n,
      delta: -3,
      reason: 'Livraison',
      source: 'manual',
      userId: 42,
      restaurantId: 7,
      occurredAt: new Date('2026-11-03T12:00:00.000Z'),
    });
    expect(result).toMatchObject({
      id: '10',
      productNameCn: '纸袋',
      userId: 42,
      restaurantId: 7,
      occurredAt: '2026-11-03T12:00:00.000Z',
    });
  });

  it('rejects a destination store on inbound movements', async () => {
    const { service } = buildService();
    await expect(
      service.createMovement({ productId: 5, delta: 4, restaurantId: 7 }, 42),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a zero delta', async () => {
    const { service } = buildService();
    await expect(
      service.createMovement({ productId: 5, delta: 0 }, 42),
    ).rejects.toThrow('DELTA_MUST_BE_NON_ZERO');
  });

  it('rejects an unknown store', async () => {
    const { prisma, service } = buildService();
    prisma.product.findUnique.mockResolvedValue({
      id: 5n,
      nameCn: '纸袋',
      designationFr: null,
    });
    prisma.restaurant.findUnique.mockResolvedValue(null);

    await expect(
      service.createMovement({ productId: 5, delta: -1, restaurantId: 99 }, 42),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
  });
});

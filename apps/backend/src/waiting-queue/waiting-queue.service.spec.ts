import { NotFoundException } from '@nestjs/common';
import { WaitingQueueService } from './waiting-queue.service';

const ACTOR = {
  id: 7,
  restaurantId: 2,
};

const OTHER_ACTOR = {
  id: 9,
  restaurantId: 99,
};

const ENTRY_RECORD = {
  id: 11,
  restaurantId: 2,
  createdByUserId: 7,
  customerName: 'Dupont',
  partySize: 3,
  hasDisabled: false,
  hasPregnant: true,
  hasElderly: false,
  note: null,
  status: 'waiting',
  seatedAt: null,
  createdAt: new Date('2026-06-25T10:00:00.000Z'),
  updatedAt: new Date('2026-06-25T10:00:00.000Z'),
};

const ANY_DATE = expect.any(Date) as unknown as Date;

function createPrismaServiceMock() {
  return {
    waitingQueueEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('WaitingQueueService', () => {
  it('creates a waiting entry scoped to the actor restaurant', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.waitingQueueEntry.create.mockResolvedValue(ENTRY_RECORD);
    const service = new WaitingQueueService(prismaService as never);

    const result = await service.createEntry(ACTOR, {
      customerName: '  Dupont  ',
      partySize: 3,
      hasPregnant: true,
      note: '  ',
    });

    expect(prismaService.waitingQueueEntry.create).toHaveBeenCalledWith({
      data: {
        restaurantId: ACTOR.restaurantId,
        createdByUserId: ACTOR.id,
        customerName: 'Dupont',
        partySize: 3,
        hasDisabled: false,
        hasPregnant: true,
        hasElderly: false,
        note: null,
      },
    });
    expect(result).toMatchObject({
      id: ENTRY_RECORD.id,
      customerName: 'Dupont',
      partySize: 3,
      hasPregnant: true,
      status: 'waiting',
    });
  });

  it('lists only the active entries of the actor restaurant', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.waitingQueueEntry.findMany.mockResolvedValue([ENTRY_RECORD]);
    const service = new WaitingQueueService(prismaService as never);

    await service.listEntries(ACTOR, {});

    expect(prismaService.waitingQueueEntry.findMany).toHaveBeenCalledWith({
      where: { restaurantId: ACTOR.restaurantId, status: 'waiting' },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  });

  it('sets seatedAt when an entry is seated', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.waitingQueueEntry.findFirst.mockResolvedValue({ id: 11 });
    prismaService.waitingQueueEntry.update.mockResolvedValue({
      ...ENTRY_RECORD,
      status: 'seated',
      seatedAt: new Date('2026-06-25T10:30:00.000Z'),
    });
    const service = new WaitingQueueService(prismaService as never);

    const result = await service.updateEntryStatus(ACTOR, ENTRY_RECORD.id, {
      status: 'seated',
    });

    expect(prismaService.waitingQueueEntry.update).toHaveBeenCalledWith({
      where: { id: ENTRY_RECORD.id },
      data: { status: 'seated', seatedAt: ANY_DATE },
    });
    expect(result.status).toBe('seated');
    expect(result.seatedAt).not.toBeNull();
  });

  it('throws when updating an entry from another restaurant', async () => {
    const prismaService = createPrismaServiceMock();
    prismaService.waitingQueueEntry.findFirst.mockResolvedValue(null);
    const service = new WaitingQueueService(prismaService as never);

    await expect(
      service.updateEntryStatus(OTHER_ACTOR, ENTRY_RECORD.id, {
        status: 'seated',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

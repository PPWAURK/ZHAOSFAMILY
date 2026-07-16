import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbcScoresService } from './abc-scores.service';

const ACTOR = { id: 7, permissions: [] };
const ANY_DATE = expect.any(Date) as unknown as Date;

const DRAFT_CYCLE = {
  id: 1,
  label: 'Juin 2026',
  status: 'draft',
  publishedAt: null,
  createdAt: new Date('2026-06-22T10:00:00.000Z'),
  updatedAt: new Date('2026-06-22T10:00:00.000Z'),
};

const RESTAURANT = {
  id: 2,
  name: 'ZHAO Store',
  address: '1 rue de Test',
  photoUrl: null,
};

function createPrismaServiceMock() {
  return {
    abcScoreCycle: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    abcStoreInspection: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      upsert: jest.fn(),
    },
    abcInspectionMedia: { create: jest.fn(), findMany: jest.fn() },
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };
}

function createMediaServiceMock() {
  return { deleteFile: jest.fn() };
}

describe('AbcScoresService', () => {
  let prisma: ReturnType<typeof createPrismaServiceMock>;
  let media: ReturnType<typeof createMediaServiceMock>;
  let service: AbcScoresService;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    media = createMediaServiceMock();
    service = new AbcScoresService(prisma as never, media as never);
  });

  describe('getProgress', () => {
    it('counts stores with a recorded grade against the total', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.count.mockResolvedValue(12);
      prisma.abcStoreInspection.findMany.mockResolvedValue([
        { grade: 'A' },
        { grade: null },
        { grade: 'C' },
      ]);

      await expect(service.getProgress(1)).resolves.toEqual({
        filled: 2,
        total: 12,
      });
      expect(prisma.restaurant.count).toHaveBeenCalledWith({
        where: { name: { not: 'ZHAO Groupe' } },
      });
    });

    it('throws when the cycle does not exist', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(null);

      await expect(service.getProgress(404)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('recordInspection', () => {
    it('upserts a grade and improvement notes without storing a score', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT);
      prisma.abcStoreInspection.upsert.mockResolvedValue({
        ...RESTAURANT,
        grade: 'B',
        inspectionNotes: 'Improve closing checklist',
        inspectedAt: new Date('2026-06-22T11:00:00.000Z'),
        media: [],
      });

      const item = await service.recordInspection(ACTOR, 1, 2, {
        grade: 'B',
        notes: 'Improve closing checklist',
      });

      expect(item).toMatchObject({
        grade: 'B',
        inspectionNotes: 'Improve closing checklist',
      });
      const inspectionData = {
        grade: 'B',
        inspectionNotes: 'Improve closing checklist',
        inspectedByUserId: 7,
        inspectedAt: ANY_DATE,
      };
      expect(prisma.abcStoreInspection.upsert).toHaveBeenCalledWith({
        where: { cycleId_restaurantId: { cycleId: 1, restaurantId: 2 } },
        create: { cycleId: 1, restaurantId: 2, ...inspectionData },
        update: inspectionData,
        include: { media: { orderBy: { createdAt: 'desc' } } },
      });
    });

    it('rejects edits on an archived cycle', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue({
        ...DRAFT_CYCLE,
        status: 'published',
      });

      await expect(
        service.recordInspection(ACTOR, 1, 2, { grade: 'A' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects recording an inspection for the holding entity', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findUnique.mockResolvedValue({
        ...RESTAURANT,
        id: 99,
        name: 'ZHAO Groupe',
      });

      await expect(
        service.recordInspection(ACTOR, 1, 99, { grade: 'A' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getGradeDirectory', () => {
    it('returns stores in the configured store order without rank or score', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findMany.mockResolvedValue([
        { id: 1, name: 'Alpha', address: 'A', photoUrl: null },
        { id: 2, name: 'Bravo', address: 'B', photoUrl: null },
      ]);
      prisma.abcStoreInspection.findMany.mockResolvedValue([
        {
          restaurantId: 2,
          grade: 'A',
          inspectionNotes: 'Keep standards',
          inspectedAt: new Date('2026-06-22T11:00:00.000Z'),
        },
      ]);

      const directory = await service.getGradeDirectory(1);

      expect(directory.entries).toEqual([
        expect.objectContaining({ restaurantId: 1, grade: null }),
        expect.objectContaining({ restaurantId: 2, grade: 'A' }),
      ]);
      expect(directory.entries[1]).not.toHaveProperty('rank');
      expect(directory.entries[1]).not.toHaveProperty('totalScore');
    });
  });

  describe('getPublishedGradeBoard', () => {
    it('lists published grade cycles from newest to oldest', async () => {
      prisma.abcScoreCycle.findMany.mockResolvedValue([
        {
          ...DRAFT_CYCLE,
          id: 2,
          status: 'published',
          publishedAt: new Date('2026-06-24T09:00:00.000Z'),
        },
      ]);

      await expect(service.listPublishedGradeCycles()).resolves.toEqual([
        expect.objectContaining({ id: 2, status: 'published' }),
      ]);
      expect(prisma.abcScoreCycle.findMany).toHaveBeenCalledWith({
        where: { status: 'published' },
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 24,
      });
    });

    it('returns only grade-board fields from the latest published cycle', async () => {
      prisma.abcScoreCycle.findFirst.mockResolvedValue({
        ...DRAFT_CYCLE,
        status: 'published',
        publishedAt: new Date('2026-06-24T09:00:00.000Z'),
      });
      prisma.abcScoreCycle.findUnique.mockResolvedValue({
        ...DRAFT_CYCLE,
        status: 'published',
      });
      prisma.restaurant.findMany.mockResolvedValue([
        { id: 1, name: 'Alpha', address: 'A', photoUrl: null },
        { id: 2, name: 'Bravo', address: 'B', photoUrl: null },
      ]);
      prisma.abcStoreInspection.findMany.mockResolvedValue([
        {
          restaurantId: 2,
          grade: 'A',
          inspectionNotes: 'Keep standards',
          inspectedAt: new Date('2026-06-22T11:00:00.000Z'),
        },
      ]);

      const board = await service.getPublishedGradeBoard();

      expect(board?.entries).toEqual([
        {
          restaurantId: 2,
          storeName: 'Bravo',
          storeAddress: 'B',
          photoUrl: null,
          grade: 'A',
        },
      ]);
      expect(board?.entries[0]).not.toHaveProperty('inspectionNotes');
      expect(board?.entries[0]).not.toHaveProperty('media');
      expect(board?.entries[0]).not.toHaveProperty('totalScore');
    });

    it('returns null when no cycle has been published', async () => {
      prisma.abcScoreCycle.findFirst.mockResolvedValue(null);

      await expect(service.getPublishedGradeBoard()).resolves.toBeNull();
    });
  });

  describe('publishCycle', () => {
    it('archives a draft cycle without broadcasting a leaderboard notification', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.abcScoreCycle.update.mockResolvedValue({
        ...DRAFT_CYCLE,
        status: 'published',
        publishedAt: new Date('2026-06-24T09:00:00.000Z'),
      });

      await expect(service.publishCycle(1)).resolves.toMatchObject({
        status: 'published',
      });
    });
  });

  describe('deleteCycle', () => {
    it('deletes the cycle and best-effort removes private report objects', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.abcInspectionMedia.findMany.mockResolvedValue([
        { objectKey: 'abc-inspections/reports/a.pdf' },
      ]);
      prisma.abcScoreCycle.delete.mockResolvedValue(DRAFT_CYCLE);
      media.deleteFile.mockResolvedValue(undefined);

      await expect(service.deleteCycle(1)).resolves.toEqual({ id: 1 });
      expect(media.deleteFile).toHaveBeenCalledWith(
        'abc-inspections/reports/a.pdf',
      );
    });
  });
});

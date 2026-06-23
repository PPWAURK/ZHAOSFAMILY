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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    abcStoreScore: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      upsert: jest.fn(),
    },
    abcScoreMedia: { create: jest.fn() },
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  };
}

describe('AbcScoresService', () => {
  let prisma: ReturnType<typeof createPrismaServiceMock>;
  let service: AbcScoresService;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    service = new AbcScoresService(prisma as never);
  });

  describe('getProgress', () => {
    it('counts stores filled per department against the total', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.count.mockResolvedValue(12);
      prisma.abcStoreScore.findMany.mockResolvedValue([
        { marketingScore: 80, operationsScore: null },
        { marketingScore: 70, operationsScore: 90 },
        { marketingScore: null, operationsScore: 60 },
      ]);

      const progress = await service.getProgress(1);

      expect(progress).toEqual({
        marketing: { filled: 2, total: 12 },
        operations: { filled: 2, total: 12 },
      });
      // 总数排除控股实体「ZHAO Groupe」（非门店）。
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

  describe('fillMarketingScore', () => {
    it('upserts the marketing fields with audit metadata', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT);
      prisma.abcStoreScore.upsert.mockResolvedValue({
        ...RESTAURANT,
        marketingScore: 88,
        marketingNotes: 'Great reviews',
        marketingFilledAt: new Date('2026-06-22T11:00:00.000Z'),
        operationsScore: null,
        operationsNotes: null,
        operationsFilledAt: null,
        media: [],
      });

      const item = await service.fillMarketingScore(ACTOR, 1, 2, {
        score: 88,
        notes: 'Great reviews',
      });

      expect(item.marketingScore).toBe(88);
      const marketingData = {
        marketingScore: 88,
        marketingNotes: 'Great reviews',
        marketingFilledByUserId: 7,
        marketingFilledAt: ANY_DATE,
      };
      expect(prisma.abcStoreScore.upsert).toHaveBeenCalledWith({
        where: { cycleId_restaurantId: { cycleId: 1, restaurantId: 2 } },
        create: { cycleId: 1, restaurantId: 2, ...marketingData },
        update: marketingData,
        include: { media: { orderBy: { createdAt: 'desc' } } },
      });
    });

    it('rejects edits on a published cycle', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue({
        ...DRAFT_CYCLE,
        status: 'published',
      });

      await expect(
        service.fillMarketingScore(ACTOR, 1, 2, { score: 50 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects scoring the holding entity (not a store)', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 99,
        name: 'ZHAO Groupe',
        address: '169 avenue de Choisy 75013',
        photoUrl: null,
      });

      await expect(
        service.fillMarketingScore(ACTOR, 1, 99, { score: 50 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getLeaderboard', () => {
    it('ranks stores by total score and returns the manual grade', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findMany.mockResolvedValue([
        { id: 1, name: 'Alpha' },
        { id: 2, name: 'Bravo' },
        { id: 3, name: 'Charlie' },
      ]);
      prisma.abcStoreScore.findMany.mockResolvedValue([
        {
          restaurantId: 1,
          marketingScore: 10,
          operationsScore: 10,
          grade: 'C',
        },
        {
          restaurantId: 2,
          marketingScore: 90,
          operationsScore: 90,
          grade: 'A',
        },
        {
          restaurantId: 3,
          marketingScore: 50,
          operationsScore: 50,
          grade: null,
        },
      ]);

      const board = await service.getLeaderboard(1);

      expect(board.entries.map((entry) => entry.restaurantId)).toEqual([
        2, 3, 1,
      ]);
      // 排名仍按总分降序，但 A/B/C 来自手动填写（未填写为 null，不自动计算）。
      expect(board.entries.map((entry) => entry.grade)).toEqual([
        'A',
        null,
        'C',
      ]);
      expect(board.entries[0].totalScore).toBe(180);
    });
  });

  describe('fillOperationsScore', () => {
    it('persists the manually entered grade alongside the audit score', async () => {
      prisma.abcScoreCycle.findUnique.mockResolvedValue(DRAFT_CYCLE);
      prisma.restaurant.findUnique.mockResolvedValue(RESTAURANT);
      prisma.abcStoreScore.upsert.mockResolvedValue({
        ...RESTAURANT,
        marketingScore: null,
        marketingNotes: null,
        marketingFilledAt: null,
        operationsScore: 75,
        operationsNotes: null,
        operationsFilledAt: new Date('2026-06-22T11:00:00.000Z'),
        grade: 'B',
        media: [],
      });

      const item = await service.fillOperationsScore(ACTOR, 1, 2, {
        score: 75,
        grade: 'B',
      });

      expect(item.grade).toBe('B');
      const operationsData = {
        operationsScore: 75,
        operationsNotes: null,
        operationsFilledByUserId: 7,
        operationsFilledAt: ANY_DATE,
        grade: 'B',
      };
      expect(prisma.abcStoreScore.upsert).toHaveBeenCalledWith({
        where: { cycleId_restaurantId: { cycleId: 1, restaurantId: 2 } },
        create: { cycleId: 1, restaurantId: 2, ...operationsData },
        update: operationsData,
        include: { media: { orderBy: { createdAt: 'desc' } } },
      });
    });
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CaseSharesService } from './case-shares.service';

const AUTHOR = { id: 7, restaurantId: 3, permissions: [] };
const REVIEWER = { id: 9, restaurantId: 1, permissions: ['case.share.review'] };

const ANY_DATE = expect.any(Date) as unknown as Date;

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    authorId: AUTHOR.id,
    restaurantId: AUTHOR.restaurantId,
    type: 'personal',
    content: 'Une belle histoire de partenaire',
    imageBucket: null,
    imageObjectKey: null,
    imageName: null,
    imageMimeType: null,
    imageSizeBytes: null,
    status: 'pending',
    reviewNote: null,
    reviewedByUserId: null,
    reviewedAt: null,
    createdAt: new Date('2026-06-23T10:00:00.000Z'),
    updatedAt: new Date('2026-06-23T10:00:00.000Z'),
    author: { id: AUTHOR.id, name: 'Wang', email: 'wang@zhao.local' },
    restaurant: { id: AUTHOR.restaurantId, name: 'ZHAO Choisy' },
    likes: [],
    _count: { likes: 0, comments: 0 },
    ...overrides,
  };
}

function createPrismaServiceMock() {
  return {
    caseShare: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    caseShareComment: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    caseShareLike: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
}

function createMediaServiceMock() {
  return { deleteFile: jest.fn() };
}

function createNotificationsServiceMock() {
  return { sendToUsers: jest.fn() };
}

// findApprovedOrThrow lit author.preferredLanguage ; helper pour les mocks.
function approvedCase(authorId: number) {
  return { id: 1, authorId, author: { preferredLanguage: 'fr' } };
}

describe('CaseSharesService', () => {
  let prisma: ReturnType<typeof createPrismaServiceMock>;
  let media: ReturnType<typeof createMediaServiceMock>;
  let notifications: ReturnType<typeof createNotificationsServiceMock>;
  let service: CaseSharesService;

  beforeEach(() => {
    prisma = createPrismaServiceMock();
    media = createMediaServiceMock();
    notifications = createNotificationsServiceMock();
    service = new CaseSharesService(
      prisma as never,
      media as never,
      notifications as never,
    );
  });

  describe('create', () => {
    it('creates a case with pending status and author/restaurant binding', async () => {
      prisma.caseShare.create.mockResolvedValue(makeRecord());

      const item = await service.create(AUTHOR, {
        type: 'personal',
        content: '  Une belle histoire de partenaire  ',
      });

      expect(prisma.caseShare.create).toHaveBeenCalledWith({
        data: {
          authorId: AUTHOR.id,
          restaurantId: AUTHOR.restaurantId,
          type: 'personal',
          content: 'Une belle histoire de partenaire',
          status: 'pending',
          imageBucket: null,
          imageObjectKey: null,
          imageName: null,
          imageMimeType: null,
          imageSizeBytes: null,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
          restaurant: { select: { id: true, name: true } },
          likes: { where: { userId: AUTHOR.id }, select: { id: true } },
          _count: { select: { comments: true, likes: true } },
        },
      });
      expect(item.status).toBe('pending');
      expect(item.canDelete).toBe(true);
      expect(item.canReview).toBe(false);
      expect(item.likeCount).toBe(0);
      expect(item.commentCount).toBe(0);
      expect(item.likedByCurrentUser).toBe(false);
    });
  });

  describe('listPublic', () => {
    it('returns only approved cases, newest reviewed first, paginated', async () => {
      prisma.caseShare.findMany.mockResolvedValue([
        makeRecord({ status: 'approved' }),
      ]);
      prisma.caseShare.count.mockResolvedValue(1);

      const result = await service.listPublic(AUTHOR, {});

      expect(prisma.caseShare.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'approved' },
          orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
          skip: 0,
          take: 10,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({ page: 1, pageSize: 10, total: 1 }),
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('listMine', () => {
    it('scopes to the author and applies the optional status filter', async () => {
      prisma.caseShare.findMany.mockResolvedValue([
        makeRecord({ status: 'rejected', reviewNote: 'Hors sujet' }),
      ]);
      prisma.caseShare.count.mockResolvedValue(1);

      const result = await service.listMine(AUTHOR, { status: 'rejected' });

      expect(prisma.caseShare.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: AUTHOR.id, status: 'rejected' },
          orderBy: [{ createdAt: 'desc' }],
        }),
      );
      // 作者本人可见审核备注。
      expect(result.items[0].reviewNote).toBe('Hors sujet');
    });
  });

  describe('review', () => {
    it('rejects without a review note', async () => {
      await expect(
        service.review(REVIEWER, 1, { status: 'rejected' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.caseShare.update).not.toHaveBeenCalled();
    });

    it('approves and stamps reviewer metadata', async () => {
      prisma.caseShare.findUnique.mockResolvedValue({ id: 1 });
      prisma.caseShare.update.mockResolvedValue(
        makeRecord({
          status: 'approved',
          reviewedByUserId: REVIEWER.id,
          reviewedAt: new Date('2026-06-23T12:00:00.000Z'),
        }),
      );

      const item = await service.review(REVIEWER, 1, { status: 'approved' });

      expect(prisma.caseShare.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: {
            status: 'approved',
            reviewNote: null,
            reviewedByUserId: REVIEWER.id,
            reviewedAt: ANY_DATE,
          },
        }),
      );
      expect(item.status).toBe('approved');
    });

    it('throws when the case does not exist', async () => {
      prisma.caseShare.findUnique.mockResolvedValue(null);

      await expect(
        service.review(REVIEWER, 404, { status: 'approved' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('lets the author delete a pending case and cleans up its image', async () => {
      prisma.caseShare.findUnique.mockResolvedValue({
        id: 1,
        authorId: AUTHOR.id,
        status: 'pending',
        imageObjectKey: 'case-shares/2026/06/photo.jpg',
      });
      prisma.caseShare.delete.mockResolvedValue({ id: 1 });
      media.deleteFile.mockResolvedValue(undefined);

      const result = await service.remove(AUTHOR, 1);

      expect(result).toEqual({ id: 1 });
      expect(prisma.caseShare.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(media.deleteFile).toHaveBeenCalledWith(
        'case-shares/2026/06/photo.jpg',
      );
    });

    it('forbids deleting an approved case', async () => {
      prisma.caseShare.findUnique.mockResolvedValue({
        id: 1,
        authorId: AUTHOR.id,
        status: 'approved',
        imageObjectKey: null,
      });

      await expect(service.remove(AUTHOR, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.caseShare.delete).not.toHaveBeenCalled();
    });

    it('forbids deleting a case the actor does not own', async () => {
      prisma.caseShare.findUnique.mockResolvedValue({
        id: 1,
        authorId: 99,
        status: 'pending',
        imageObjectKey: null,
      });

      await expect(service.remove(AUTHOR, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.caseShare.delete).not.toHaveBeenCalled();
    });
  });

  describe('like', () => {
    it('upserts a like on an approved case and returns updated counts', async () => {
      // 自己点赞自己的案例：不发通知。
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(AUTHOR.id));
      prisma.caseShareLike.findUnique.mockResolvedValue(null);
      prisma.caseShareLike.upsert.mockResolvedValue({});
      prisma.caseShare.findUnique.mockResolvedValue(
        makeRecord({
          status: 'approved',
          likes: [{ id: 50 }],
          _count: { likes: 1, comments: 0 },
        }),
      );

      const item = await service.like(AUTHOR, 1);

      expect(prisma.caseShareLike.upsert).toHaveBeenCalledWith({
        where: { caseShareId_userId: { caseShareId: 1, userId: AUTHOR.id } },
        create: { caseShareId: 1, userId: AUTHOR.id },
        update: {},
      });
      expect(item.likeCount).toBe(1);
      expect(item.likedByCurrentUser).toBe(true);
      expect(notifications.sendToUsers).not.toHaveBeenCalled();
    });

    it('notifies the author on a first like from another user', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(99));
      prisma.caseShareLike.findUnique.mockResolvedValue(null);
      prisma.caseShareLike.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ name: 'Wang' });
      prisma.caseShare.findUnique.mockResolvedValue(
        makeRecord({ status: 'approved' }),
      );

      await service.like(AUTHOR, 1);

      expect(notifications.sendToUsers).toHaveBeenCalledWith(
        [99],
        expect.objectContaining({
          data: { type: 'case-share', caseShareId: '1' },
        }),
      );
    });

    it('does not notify when the like already existed', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(99));
      prisma.caseShareLike.findUnique.mockResolvedValue({ id: 5 });
      prisma.caseShareLike.upsert.mockResolvedValue({});
      prisma.caseShare.findUnique.mockResolvedValue(
        makeRecord({ status: 'approved' }),
      );

      await service.like(AUTHOR, 1);

      expect(notifications.sendToUsers).not.toHaveBeenCalled();
    });

    it('rejects liking a non-approved case', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(null);

      await expect(service.like(AUTHOR, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.caseShareLike.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unlike', () => {
    it('removes the like and returns updated counts', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(AUTHOR.id));
      prisma.caseShareLike.deleteMany.mockResolvedValue({ count: 1 });
      prisma.caseShare.findUnique.mockResolvedValue(
        makeRecord({
          status: 'approved',
          likes: [],
          _count: { likes: 0, comments: 0 },
        }),
      );

      const item = await service.unlike(AUTHOR, 1);

      expect(prisma.caseShareLike.deleteMany).toHaveBeenCalledWith({
        where: { caseShareId: 1, userId: AUTHOR.id },
      });
      expect(item.likeCount).toBe(0);
      expect(item.likedByCurrentUser).toBe(false);
    });
  });

  describe('createComment', () => {
    it('creates a comment on an approved case', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(AUTHOR.id));
      prisma.caseShareComment.create.mockResolvedValue({
        id: 9,
        content: 'Bravo',
        createdAt: new Date('2026-06-23T12:00:00.000Z'),
        author: { id: AUTHOR.id, name: 'Wang', email: 'wang@zhao.local' },
      });

      const comment = await service.createComment(AUTHOR, 1, {
        content: '  Bravo  ',
      });

      expect(prisma.caseShareComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { caseShareId: 1, authorId: AUTHOR.id, content: 'Bravo' },
        }),
      );
      expect(comment.content).toBe('Bravo');
      expect(comment.author.name).toBe('Wang');
    });

    it('rejects commenting on a non-approved case', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(null);

      await expect(
        service.createComment(AUTHOR, 1, { content: 'Bravo' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.caseShareComment.create).not.toHaveBeenCalled();
    });
  });

  describe('listComments', () => {
    it('returns paginated comments of an approved case oldest-first', async () => {
      prisma.caseShare.findFirst.mockResolvedValue(approvedCase(AUTHOR.id));
      prisma.caseShareComment.findMany.mockResolvedValue([
        {
          id: 9,
          content: 'Bravo',
          createdAt: new Date('2026-06-23T12:00:00.000Z'),
          author: { id: AUTHOR.id, name: 'Wang', email: 'wang@zhao.local' },
        },
      ]);
      prisma.caseShareComment.count.mockResolvedValue(1);

      const result = await service.listComments(AUTHOR, 1, {});

      expect(prisma.caseShareComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caseShareId: 1 },
          orderBy: { createdAt: 'asc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0].content).toBe('Bravo');
    });
  });
});

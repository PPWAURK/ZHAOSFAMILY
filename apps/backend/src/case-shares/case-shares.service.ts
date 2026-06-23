import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { CASE_SHARE_PERMISSIONS } from '../auth/permissions';
import { MediaService } from '../media/media.service';
import {
  caseShareCommentNotification,
  caseShareLikeNotification,
} from '../notifications/notification-content';
import { NotificationsService } from '../notifications/notifications.service';
import type { NotificationPayload } from '../notifications/notifications.types';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCaseShareDto } from './dto/create-case-share.dto';
import type { CreateCaseShareCommentDto } from './dto/create-case-share-comment.dto';
import type { ListCaseSharesQueryDto } from './dto/list-case-shares-query.dto';
import type { ListMyCaseSharesQueryDto } from './dto/list-my-case-shares-query.dto';
import type { ReviewCaseShareDto } from './dto/review-case-share.dto';
import type {
  CaseShareActor,
  CaseShareCommentItem,
  CaseShareItem,
  CaseShareStatus,
  CaseShareType,
  PaginatedCaseShareComments,
  PaginatedCaseShares,
} from './case-shares.types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_COMMENTS_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const IMAGE_OBJECT_KEY_PREFIX = 'case-shares/';

// likes filtré sur l'utilisateur courant -> likedByCurrentUser ; _count -> totaux.
function buildCaseShareInclude(actorId: number) {
  return {
    author: { select: { id: true, name: true, email: true } },
    restaurant: { select: { id: true, name: true } },
    likes: { where: { userId: actorId }, select: { id: true } },
    _count: { select: { comments: true, likes: true } },
  } satisfies Prisma.CaseShareInclude;
}

type CaseShareRecord = Prisma.CaseShareGetPayload<{
  include: ReturnType<typeof buildCaseShareInclude>;
}>;

type CaseShareCommentRecord = Prisma.CaseShareCommentGetPayload<{
  include: { author: { select: { id: true; name: true; email: true } } };
}>;

@Injectable()
export class CaseSharesService {
  private readonly logger = new Logger(CaseSharesService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPublic(
    actor: CaseShareActor,
    query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    return this.paginate(actor, { status: 'approved' }, query, [
      { reviewedAt: 'desc' },
      { createdAt: 'desc' },
    ]);
  }

  async listMine(
    actor: CaseShareActor,
    query: ListMyCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    const where: Prisma.CaseShareWhereInput = { authorId: actor.id };
    if (query.status) {
      where.status = query.status;
    }

    return this.paginate(actor, where, query, [{ createdAt: 'desc' }]);
  }

  async listPending(
    actor: CaseShareActor,
    query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    return this.paginate(actor, { status: 'pending' }, query, [
      { createdAt: 'asc' },
    ]);
  }

  async getDetail(actor: CaseShareActor, id: number): Promise<CaseShareItem> {
    const record = await this.prismaService.caseShare.findFirst({
      where: { AND: [{ id }, this.buildVisibilityWhere(actor)] },
      include: buildCaseShareInclude(actor.id),
    });

    if (!record) {
      throw new NotFoundException('CASE_SHARE_NOT_FOUND');
    }

    return this.mapItem(record, actor);
  }

  async create(
    actor: CaseShareActor,
    dto: CreateCaseShareDto,
  ): Promise<CaseShareItem> {
    const record = await this.prismaService.caseShare.create({
      data: {
        authorId: actor.id,
        restaurantId: actor.restaurantId,
        type: dto.type,
        content: dto.content.trim(),
        status: 'pending',
        imageBucket: dto.imageBucket?.trim() || null,
        imageObjectKey: dto.imageObjectKey?.trim() || null,
        imageName: dto.imageName?.trim() || null,
        imageMimeType: dto.imageMimeType?.trim() || null,
        imageSizeBytes:
          dto.imageSizeBytes === undefined ? null : BigInt(dto.imageSizeBytes),
      },
      include: buildCaseShareInclude(actor.id),
    });

    return this.mapItem(record, actor);
  }

  async remove(actor: CaseShareActor, id: number): Promise<{ id: number }> {
    const record = await this.prismaService.caseShare.findUnique({
      where: { id },
      select: { id: true, authorId: true, status: true, imageObjectKey: true },
    });

    if (!record) {
      throw new NotFoundException('CASE_SHARE_NOT_FOUND');
    }

    const isAuthor = record.authorId === actor.id;
    const isDeletableStatus =
      record.status === 'pending' || record.status === 'rejected';

    if (!isAuthor || !isDeletableStatus) {
      throw new ForbiddenException('CASE_SHARE_DELETE_FORBIDDEN');
    }

    await this.prismaService.caseShare.delete({ where: { id } });
    await this.deleteImage(record.imageObjectKey);

    return { id };
  }

  async review(
    actor: CaseShareActor,
    id: number,
    dto: ReviewCaseShareDto,
  ): Promise<CaseShareItem> {
    const status = dto.status as Exclude<CaseShareStatus, 'pending'>;
    const reviewNote = dto.reviewNote?.trim() || null;

    if (status === 'rejected' && !reviewNote) {
      throw new ForbiddenException('CASE_SHARE_REVIEW_NOTE_REQUIRED');
    }

    const existing = await this.prismaService.caseShare.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('CASE_SHARE_NOT_FOUND');
    }

    const record = await this.prismaService.caseShare.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedByUserId: actor.id,
        reviewedAt: new Date(),
      },
      include: buildCaseShareInclude(actor.id),
    });

    return this.mapItem(record, actor);
  }

  private async paginate(
    actor: CaseShareActor,
    where: Prisma.CaseShareWhereInput,
    query: ListCaseSharesQueryDto,
    orderBy: Prisma.CaseShareOrderByWithRelationInput[],
  ): Promise<PaginatedCaseShares> {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const pageSize = Math.min(
      query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );

    const [records, total] = await Promise.all([
      this.prismaService.caseShare.findMany({
        where,
        include: buildCaseShareInclude(actor.id),
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.caseShare.count({ where }),
    ]);

    return {
      items: records.map((record) => this.mapItem(record, actor)),
      page,
      pageSize,
      total,
    };
  }

  private buildVisibilityWhere(
    actor: CaseShareActor,
  ): Prisma.CaseShareWhereInput {
    const conditions: Prisma.CaseShareWhereInput[] = [
      { status: 'approved' },
      { authorId: actor.id },
    ];

    if (this.canReview(actor)) {
      conditions.push({ status: 'pending' });
    }

    return { OR: conditions };
  }

  async listComments(
    actor: CaseShareActor,
    id: number,
    query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShareComments> {
    await this.findApprovedOrThrow(id);

    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const pageSize = Math.min(
      query.pageSize && query.pageSize > 0
        ? query.pageSize
        : DEFAULT_COMMENTS_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const where: Prisma.CaseShareCommentWhereInput = { caseShareId: id };

    const [records, total] = await Promise.all([
      this.prismaService.caseShareComment.findMany({
        where,
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prismaService.caseShareComment.count({ where }),
    ]);

    return {
      items: records.map((record) => this.mapComment(record)),
      page,
      pageSize,
      total,
    };
  }

  async createComment(
    actor: CaseShareActor,
    id: number,
    dto: CreateCaseShareCommentDto,
  ): Promise<CaseShareCommentItem> {
    const approved = await this.findApprovedOrThrow(id);

    const record = await this.prismaService.caseShareComment.create({
      data: {
        caseShareId: id,
        authorId: actor.id,
        content: dto.content.trim(),
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await this.notifyAuthor(actor.id, approved, (name) =>
      caseShareCommentNotification(approved.authorLanguage, id, name),
    );

    return this.mapComment(record);
  }

  async like(actor: CaseShareActor, id: number): Promise<CaseShareItem> {
    const approved = await this.findApprovedOrThrow(id);

    const existing = await this.prismaService.caseShareLike.findUnique({
      where: { caseShareId_userId: { caseShareId: id, userId: actor.id } },
      select: { id: true },
    });

    await this.prismaService.caseShareLike.upsert({
      where: { caseShareId_userId: { caseShareId: id, userId: actor.id } },
      create: { caseShareId: id, userId: actor.id },
      update: {},
    });

    // 仅在「首次点赞」时通知作者，避免取消后重新点赞反复打扰。
    if (!existing) {
      await this.notifyAuthor(actor.id, approved, (name) =>
        caseShareLikeNotification(approved.authorLanguage, id, name),
      );
    }

    return this.fetchItemOrThrow(actor, id);
  }

  async unlike(actor: CaseShareActor, id: number): Promise<CaseShareItem> {
    await this.findApprovedOrThrow(id);

    await this.prismaService.caseShareLike.deleteMany({
      where: { caseShareId: id, userId: actor.id },
    });

    return this.fetchItemOrThrow(actor, id);
  }

  private async findApprovedOrThrow(
    id: number,
  ): Promise<{ id: number; authorId: number; authorLanguage: string | null }> {
    const record = await this.prismaService.caseShare.findFirst({
      where: { id, status: 'approved' },
      select: {
        id: true,
        authorId: true,
        author: { select: { preferredLanguage: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('CASE_SHARE_NOT_FOUND');
    }

    return {
      id: record.id,
      authorId: record.authorId,
      authorLanguage: record.author.preferredLanguage,
    };
  }

  // Best-effort push to the case author. Never notify self; delivery failures
  // must not fail the like/comment action, so errors are swallowed after logging.
  private async notifyAuthor(
    actorId: number,
    approved: { authorId: number },
    payloadFor: (actorName: string) => NotificationPayload,
  ): Promise<void> {
    if (approved.authorId === actorId) {
      return;
    }

    try {
      const actorUser = await this.prismaService.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });

      await this.notificationsService.sendToUsers(
        [approved.authorId],
        payloadFor(actorUser?.name ?? ''),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send case-share notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async fetchItemOrThrow(
    actor: CaseShareActor,
    id: number,
  ): Promise<CaseShareItem> {
    const record = await this.prismaService.caseShare.findUnique({
      where: { id },
      include: buildCaseShareInclude(actor.id),
    });

    if (!record) {
      throw new NotFoundException('CASE_SHARE_NOT_FOUND');
    }

    return this.mapItem(record, actor);
  }

  private canReview(actor: CaseShareActor): boolean {
    return actor.permissions.includes(CASE_SHARE_PERMISSIONS.review);
  }

  private async deleteImage(objectKey: string | null): Promise<void> {
    if (!objectKey || !objectKey.startsWith(IMAGE_OBJECT_KEY_PREFIX)) {
      return;
    }

    try {
      await this.mediaService.deleteFile(objectKey);
    } catch (error) {
      this.logger.warn(
        `Failed to delete case-share image ${objectKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private mapItem(
    record: CaseShareRecord,
    actor: CaseShareActor,
  ): CaseShareItem {
    const isAuthor = record.authorId === actor.id;
    const canReview = this.canReview(actor);
    const canSeeReviewNote = isAuthor || canReview;

    return {
      id: record.id,
      type: record.type as CaseShareType,
      content: record.content,
      status: record.status as CaseShareStatus,
      author: {
        id: record.author.id,
        name: record.author.name,
        email: record.author.email,
      },
      restaurant: {
        id: record.restaurant.id,
        name: record.restaurant.name,
      },
      image: this.mapImage(record),
      reviewNote: canSeeReviewNote ? record.reviewNote : null,
      canDelete:
        isAuthor &&
        (record.status === 'pending' || record.status === 'rejected'),
      canReview,
      likeCount: record._count.likes,
      commentCount: record._count.comments,
      likedByCurrentUser: record.likes.length > 0,
      reviewedAt: record.reviewedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private mapComment(record: CaseShareCommentRecord): CaseShareCommentItem {
    return {
      id: record.id,
      content: record.content,
      author: {
        id: record.author.id,
        name: record.author.name,
        email: record.author.email,
      },
      createdAt: record.createdAt.toISOString(),
    };
  }

  private mapImage(record: CaseShareRecord): CaseShareItem['image'] {
    if (
      !record.imageBucket ||
      !record.imageObjectKey ||
      !record.imageName ||
      !record.imageMimeType ||
      record.imageSizeBytes === null
    ) {
      return null;
    }

    return {
      bucket: record.imageBucket,
      objectKey: record.imageObjectKey,
      name: record.imageName,
      mimeType: record.imageMimeType,
      sizeBytes: Number(record.imageSizeBytes),
    };
  }
}

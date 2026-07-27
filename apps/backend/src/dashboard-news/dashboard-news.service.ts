import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ACCOUNT_STATUS } from '../auth/account-status';
import { MediaService } from '../media/media.service';
import {
  dashboardPostNotification,
  normalizeLanguage,
  type NotificationLanguage,
} from '../notifications/notification-content';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDashboardNewsPostDto } from './dto/create-dashboard-news-post.dto';
import type { ListDashboardNewsPostsQueryDto } from './dto/list-dashboard-news-posts-query.dto';
import type {
  DashboardNewsActor,
  DashboardNewsCategory,
  DashboardNewsPost,
  DashboardNewsReadConfirmation,
  DashboardNewsReadStatus,
  DashboardNewsReadStatusItem,
  DashboardNewsReadSummary,
  DashboardNewsVisibility,
} from './dashboard-news.types';

const HOLDING_JOB_ROLE = 'holding';
const MANAGEMENT_JOB_ROLES = [
  HOLDING_JOB_ROLE,
  'regional-manager',
  'store-manager',
  'front-manager',
  'back-manager',
  'front-assistant',
  'back-assistant',
] as const;

function getNotificationTitle(title: string): string {
  return title.replace(
    /\[\[zhao-style:[^\]]+\]\]([\s\S]*?)\[\[\/zhao-style\]\]/g,
    '$1',
  );
}

type DashboardPostWithRelations = Prisma.DashboardPostGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true } };
    restaurant: { select: { id: true; name: true } };
  };
}>;

type DashboardPostAudienceMember = {
  id: number;
  preferredLanguage: string | null;
};

type DashboardPostReadReceipt = {
  postId: number;
  readAt: Date | null;
};

@Injectable()
export class DashboardNewsService {
  private readonly logger = new Logger(DashboardNewsService.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listPosts(
    actor: DashboardNewsActor,
    query: ListDashboardNewsPostsQueryDto,
  ): Promise<DashboardNewsPost[]> {
    const where: Prisma.DashboardPostWhereInput = {
      AND: [this.buildVisibilityWhere(actor), this.buildQueryWhere(query)],
    };
    const posts = await this.prismaService.dashboardPost.findMany({
      where,
      include: this.getPostIncludes(),
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    const readConfirmations = await this.findReadConfirmations(
      posts.map((post) => post.id),
      actor.id,
    );
    const readSummaries = this.isHoldingActor(actor)
      ? await this.findReadSummaries(posts.map((post) => post.id))
      : new Map<number, DashboardNewsReadSummary>();

    return posts.map((post) =>
      this.mapPost(
        post,
        actor,
        readConfirmations.get(post.id),
        readSummaries.get(post.id),
      ),
    );
  }

  async getPost(
    actor: DashboardNewsActor,
    id: number,
  ): Promise<DashboardNewsPost> {
    const post = await this.prismaService.dashboardPost.findFirst({
      where: {
        AND: [{ id }, this.buildVisibilityWhere(actor)],
      },
      include: this.getPostIncludes(),
    });

    if (!post) {
      throw new NotFoundException('DASHBOARD_NEWS_POST_NOT_FOUND');
    }

    const [readConfirmation, readSummary] = await Promise.all([
      this.findReadConfirmation(post.id, actor.id),
      this.isHoldingActor(actor)
        ? this.findReadSummary(post.id)
        : Promise.resolve(undefined),
    ]);

    return this.mapPost(post, actor, readConfirmation, readSummary);
  }

  async createPost(
    actor: DashboardNewsActor,
    dto: CreateDashboardNewsPostDto,
  ): Promise<DashboardNewsPost> {
    this.assertHoldingPublisher(actor);

    const { audience, post } = await this.prismaService.$transaction(
      async (transaction) => {
        const audience = await this.findPostAudience(
          transaction,
          dto.visibility,
          actor.id,
        );
        const post = await transaction.dashboardPost.create({
          data: {
            title: dto.title.trim(),
            summary: dto.summary.trim(),
            body: dto.body.trim(),
            category: dto.category,
            visibility: dto.visibility,
            tagsJson: JSON.stringify(this.normalizeTags(dto.tags ?? [])),
            attachmentName: dto.attachmentName?.trim() || null,
            attachmentMimeType: dto.attachmentMimeType?.trim() || null,
            attachmentSizeBytes:
              dto.attachmentSizeBytes === undefined
                ? null
                : BigInt(dto.attachmentSizeBytes),
            attachmentBucket: dto.attachmentBucket?.trim() || null,
            attachmentObjectKey: dto.attachmentObjectKey?.trim() || null,
            authorId: actor.id,
            restaurantId: actor.restaurantId,
            readTrackingStartedAt: new Date(),
          },
          include: this.getPostIncludes(),
        });

        if (audience.length > 0) {
          await transaction.dashboardPostReadReceipt.createMany({
            data: audience.map((user) => ({
              postId: post.id,
              userId: user.id,
            })),
          });
        }

        return { audience, post };
      },
    );

    const mapped = this.mapPost(post, actor, undefined, {
      totalRecipients: audience.length,
      readCount: 0,
      unreadCount: audience.length,
      readRate: 0,
    });
    await this.notifyPostPublished(audience, mapped);

    return mapped;
  }

  /**
   * Best-effort broadcast push when a post is published. Audience follows the
   * post's visibility (public → everyone, management → management roles); the
   * author is never notified about their own post. Delivery
   * failures must not fail publishing, so errors are swallowed after logging.
   */
  private async notifyPostPublished(
    audience: DashboardPostAudienceMember[],
    post: DashboardNewsPost,
  ): Promise<void> {
    try {
      if (audience.length === 0) {
        return;
      }

      const idsByLanguage = new Map<NotificationLanguage, number[]>();
      for (const user of audience) {
        const language = normalizeLanguage(user.preferredLanguage);
        const ids = idsByLanguage.get(language) ?? [];
        ids.push(user.id);
        idsByLanguage.set(language, ids);
      }

      await Promise.all(
        [...idsByLanguage].map(([language, ids]) =>
          this.notificationsService.sendToUsers(
            ids,
            dashboardPostNotification(
              language,
              post.id,
              getNotificationTitle(post.title),
            ),
          ),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send dashboard-news push for post ${post.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async findPostAudience(
    prisma: Prisma.TransactionClient | PrismaService,
    visibility: string,
    authorId: number,
  ): Promise<DashboardPostAudienceMember[]> {
    const users = await prisma.user.findMany({
      where: {
        accountStatus: ACCOUNT_STATUS.approved,
        id: { not: authorId },
      },
      select: { id: true, jobRole: true, preferredLanguage: true },
    });

    if (visibility === 'management') {
      return users
        .filter((user) => this.hasManagementJobRole(user.jobRole))
        .map((user) => ({
          id: user.id,
          preferredLanguage: user.preferredLanguage,
        }));
    }

    return users.map((user) => ({
      id: user.id,
      preferredLanguage: user.preferredLanguage,
    }));
  }

  async confirmRead(
    actor: DashboardNewsActor,
    id: number,
  ): Promise<DashboardNewsReadConfirmation> {
    const post = await this.prismaService.dashboardPost.findFirst({
      where: {
        AND: [{ id }, this.buildVisibilityWhere(actor)],
      },
      select: { id: true, readTrackingStartedAt: true },
    });

    if (!post) {
      throw new NotFoundException('DASHBOARD_NEWS_POST_NOT_FOUND');
    }

    if (!post.readTrackingStartedAt) {
      return { isRequired: false, confirmedAt: null };
    }

    const receipt = await this.prismaService.dashboardPostReadReceipt.findFirst(
      {
        where: { postId: id, userId: actor.id },
        select: { readAt: true },
      },
    );

    if (!receipt) {
      throw new ForbiddenException(
        'DASHBOARD_NEWS_READ_CONFIRMATION_FORBIDDEN',
      );
    }

    if (receipt.readAt) {
      return { isRequired: true, confirmedAt: receipt.readAt.toISOString() };
    }

    const confirmedAt = new Date();
    await this.prismaService.dashboardPostReadReceipt.updateMany({
      where: { postId: id, userId: actor.id, readAt: null },
      data: { readAt: confirmedAt },
    });

    return { isRequired: true, confirmedAt: confirmedAt.toISOString() };
  }

  async getReadStatus(
    actor: DashboardNewsActor,
    id: number,
  ): Promise<DashboardNewsReadStatus> {
    this.assertHoldingPublisher(actor);

    const post = await this.prismaService.dashboardPost.findUnique({
      where: { id },
      select: { readTrackingStartedAt: true },
    });

    if (!post) {
      throw new NotFoundException('DASHBOARD_NEWS_POST_NOT_FOUND');
    }

    if (!post.readTrackingStartedAt) {
      return { isTracked: false, summary: null, read: [], unread: [] };
    }

    const receipts = await this.prismaService.dashboardPostReadReceipt.findMany(
      {
        where: { postId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              restaurant: { select: { name: true } },
            },
          },
        },
        orderBy: [{ readAt: 'desc' }, { user: { name: 'asc' } }],
      },
    );
    const summary = this.buildReadSummary(receipts);
    const items = receipts.map<DashboardNewsReadStatusItem>((receipt) => ({
      userId: receipt.user.id,
      name: receipt.user.name,
      restaurantName: receipt.user.restaurant.name,
      confirmedAt: receipt.readAt?.toISOString() ?? null,
    }));

    return {
      isTracked: true,
      summary,
      read: items.filter((item) => item.confirmedAt !== null),
      unread: items.filter((item) => item.confirmedAt === null),
    };
  }

  async deletePost(actor: DashboardNewsActor, id: number): Promise<void> {
    const post = await this.prismaService.dashboardPost.findFirst({
      where: {
        AND: [{ id }, this.buildVisibilityWhere(actor)],
      },
      select: {
        id: true,
        authorId: true,
        attachmentObjectKey: true,
      },
    });

    if (!post) {
      throw new NotFoundException('DASHBOARD_NEWS_POST_NOT_FOUND');
    }

    if (!this.canDeletePost(actor)) {
      throw new ForbiddenException('DASHBOARD_NEWS_DELETE_FORBIDDEN');
    }

    await this.deleteDashboardAttachment(post.attachmentObjectKey);

    await this.prismaService.dashboardPost.delete({
      where: { id: post.id },
    });
  }

  private buildVisibilityWhere(
    actor: DashboardNewsActor,
  ): Prisma.DashboardPostWhereInput {
    const managementVisibility: Prisma.DashboardPostWhereInput[] = [];

    if (this.hasManagementJobRole(actor.jobRole)) {
      managementVisibility.push(
        { visibility: 'management' },
        { visibility: 'private' },
      );
    }

    // Legacy "team" posts are treated as public after visibility was simplified
    // to only all-staff and management scopes.
    return {
      OR: [
        { visibility: 'public' },
        { visibility: 'team' },
        ...managementVisibility,
      ],
    };
  }

  private buildQueryWhere(
    query: ListDashboardNewsPostsQueryDto,
  ): Prisma.DashboardPostWhereInput {
    const where: Prisma.DashboardPostWhereInput = {};
    const searchTerm = query.q?.trim();

    if (query.category) {
      where.category = query.category;
    }

    if (query.visibility === 'public') {
      where.visibility = { in: ['public', 'team'] };
    }

    if (query.visibility === 'management') {
      where.visibility = { in: ['management', 'private'] };
    }

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm } },
        { summary: { contains: searchTerm } },
        { body: { contains: searchTerm } },
        { tagsJson: { contains: searchTerm } },
      ];
    }

    return where;
  }

  private getPostIncludes(): {
    author: { select: { id: true; name: true; email: true } };
    restaurant: { select: { id: true; name: true } };
  } {
    return {
      author: { select: { id: true, name: true, email: true } },
      restaurant: { select: { id: true, name: true } },
    };
  }

  private normalizeTags(tags: string[]): string[] {
    const normalizedTags = tags
      .map((tag) => tag.trim().replace(/^#+/, ''))
      .filter(Boolean)
      .map((tag) => tag.slice(0, 32));

    return Array.from(new Set(normalizedTags)).slice(0, 8);
  }

  private parseTags(tagsJson: string): string[] {
    try {
      const parsedTags: unknown = JSON.parse(tagsJson);

      return Array.isArray(parsedTags)
        ? parsedTags.filter((tag): tag is string => typeof tag === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private assertHoldingPublisher(actor: DashboardNewsActor): void {
    if (!this.isHoldingActor(actor)) {
      throw new ForbiddenException('DASHBOARD_NEWS_PUBLISH_FORBIDDEN');
    }
  }

  private canDeletePost(actor: DashboardNewsActor): boolean {
    return this.isHoldingActor(actor);
  }

  private isHoldingActor(actor: DashboardNewsActor): boolean {
    return this.parseJobRoles(actor.jobRole).includes(HOLDING_JOB_ROLE);
  }

  private hasManagementJobRole(jobRole: string | null): boolean {
    const jobRoles = this.parseJobRoles(jobRole);

    return MANAGEMENT_JOB_ROLES.some((role) => jobRoles.includes(role));
  }

  private parseJobRoles(jobRole: string | null): string[] {
    return `${jobRole || ''}`
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean);
  }

  private async deleteDashboardAttachment(
    objectKey: string | null,
  ): Promise<void> {
    if (!objectKey || !objectKey.startsWith('dashboard-news/')) {
      return;
    }

    await this.mediaService.deleteFile(objectKey);
  }

  private mapPost(
    post: DashboardPostWithRelations,
    actor: DashboardNewsActor,
    readConfirmation?: Date | null,
    readSummary?: DashboardNewsReadSummary,
  ): DashboardNewsPost {
    return {
      id: post.id,
      title: post.title,
      summary: post.summary,
      body: post.body,
      category: post.category as DashboardNewsCategory,
      visibility: this.mapVisibility(post.visibility),
      tags: this.parseTags(post.tagsJson),
      attachment: this.mapAttachment(post),
      restaurantId: post.restaurantId,
      restaurantName: post.restaurant.name,
      author: {
        id: post.author.id,
        name: post.author.name,
        email: post.author.email,
      },
      canDelete: this.canDeletePost(actor),
      readConfirmation: this.mapReadConfirmation(post, readConfirmation),
      readSummary:
        this.isHoldingActor(actor) && post.readTrackingStartedAt
          ? (readSummary ?? null)
          : null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  private mapReadConfirmation(
    post: DashboardPostWithRelations,
    readConfirmation: Date | null | undefined,
  ): DashboardNewsReadConfirmation | null {
    if (!post.readTrackingStartedAt || readConfirmation === undefined) {
      return null;
    }

    return {
      isRequired: true,
      confirmedAt: readConfirmation?.toISOString() ?? null,
    };
  }

  private async findReadConfirmation(
    postId: number,
    userId: number,
  ): Promise<Date | null | undefined> {
    const receipt = await this.prismaService.dashboardPostReadReceipt.findFirst(
      {
        where: { postId, userId },
        select: { readAt: true },
      },
    );

    return receipt?.readAt;
  }

  private async findReadConfirmations(
    postIds: number[],
    userId: number,
  ): Promise<Map<number, Date | null>> {
    if (postIds.length === 0) {
      return new Map();
    }

    const receipts = await this.prismaService.dashboardPostReadReceipt.findMany(
      {
        where: { postId: { in: postIds }, userId },
        select: { postId: true, readAt: true },
      },
    );

    return new Map(
      (receipts as DashboardPostReadReceipt[]).map((receipt) => [
        receipt.postId,
        receipt.readAt,
      ]),
    );
  }

  private async findReadSummary(
    postId: number,
  ): Promise<DashboardNewsReadSummary> {
    const receipts = await this.prismaService.dashboardPostReadReceipt.findMany(
      {
        where: { postId },
        select: { postId: true, readAt: true },
      },
    );

    return this.buildReadSummary(receipts);
  }

  private async findReadSummaries(
    postIds: number[],
  ): Promise<Map<number, DashboardNewsReadSummary>> {
    if (postIds.length === 0) {
      return new Map();
    }

    const receipts = await this.prismaService.dashboardPostReadReceipt.findMany(
      {
        where: { postId: { in: postIds } },
        select: { postId: true, readAt: true },
      },
    );
    const receiptsByPostId = new Map<number, DashboardPostReadReceipt[]>();

    for (const receipt of receipts as DashboardPostReadReceipt[]) {
      const postReceipts = receiptsByPostId.get(receipt.postId) ?? [];
      postReceipts.push(receipt);
      receiptsByPostId.set(receipt.postId, postReceipts);
    }

    return new Map(
      postIds.map((postId) => [
        postId,
        this.buildReadSummary(receiptsByPostId.get(postId) ?? []),
      ]),
    );
  }

  private buildReadSummary(
    receipts: { readAt: Date | null }[],
  ): DashboardNewsReadSummary {
    const totalRecipients = receipts.length;
    const readCount = receipts.filter((receipt) => receipt.readAt).length;

    return {
      totalRecipients,
      readCount,
      unreadCount: totalRecipients - readCount,
      readRate:
        totalRecipients === 0
          ? 0
          : Math.round((readCount / totalRecipients) * 100),
    };
  }

  private mapAttachment(
    post: DashboardPostWithRelations,
  ): DashboardNewsPost['attachment'] {
    if (
      !post.attachmentName ||
      !post.attachmentMimeType ||
      post.attachmentSizeBytes === null ||
      !post.attachmentBucket ||
      !post.attachmentObjectKey
    ) {
      return null;
    }

    return {
      name: post.attachmentName,
      mimeType: post.attachmentMimeType,
      sizeBytes: Number(post.attachmentSizeBytes),
      bucket: post.attachmentBucket,
      objectKey: post.attachmentObjectKey,
    };
  }

  private mapVisibility(visibility: string): DashboardNewsVisibility {
    if (visibility === 'private') {
      return 'management';
    }

    if (visibility === 'team') {
      return 'public';
    }

    return visibility as DashboardNewsVisibility;
  }
}

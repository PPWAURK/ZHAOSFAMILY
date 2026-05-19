import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { MediaService } from '../media/media.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateDashboardNewsPostDto } from './dto/create-dashboard-news-post.dto';
import type { ListDashboardNewsPostsQueryDto } from './dto/list-dashboard-news-posts-query.dto';
import type {
  DashboardNewsActor,
  DashboardNewsCategory,
  DashboardNewsPost,
  DashboardNewsVisibility,
} from './dashboard-news.types';

const HOLDING_JOB_ROLE = 'holding';

type DashboardPostWithRelations = Prisma.DashboardPostGetPayload<{
  include: {
    author: { select: { id: true; name: true; email: true } };
    restaurant: { select: { id: true; name: true } };
  };
}>;

@Injectable()
export class DashboardNewsService {
  constructor(
    private readonly mediaService: MediaService,
    private readonly prismaService: PrismaService,
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

    return posts.map((post) => this.mapPost(post, actor));
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

    return this.mapPost(post, actor);
  }

  async createPost(
    actor: DashboardNewsActor,
    dto: CreateDashboardNewsPostDto,
  ): Promise<DashboardNewsPost> {
    this.assertHoldingPublisher(actor);

    const post = await this.prismaService.dashboardPost.create({
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
      },
      include: this.getPostIncludes(),
    });

    return this.mapPost(post, actor);
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
    const privateVisibility: Prisma.DashboardPostWhereInput[] = [
      { visibility: 'private', authorId: actor.id },
    ];

    if (actor.userLevel >= 2) {
      privateVisibility.push({ visibility: 'private' });
    }

    return {
      OR: [
        { visibility: 'public' },
        { visibility: 'team', restaurantId: actor.restaurantId },
        ...privateVisibility,
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

    if (query.visibility) {
      where.visibility = query.visibility;
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
    return `${actor.jobRole || ''}`.toLowerCase() === HOLDING_JOB_ROLE;
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
  ): DashboardNewsPost {
    return {
      id: post.id,
      title: post.title,
      summary: post.summary,
      body: post.body,
      category: post.category as DashboardNewsCategory,
      visibility: post.visibility as DashboardNewsVisibility,
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
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
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
}

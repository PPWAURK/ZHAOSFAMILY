import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { RECRUITMENT_REQUEST_PERMISSIONS } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRecruitmentRequestDto } from './dto/create-recruitment-request.dto';
import type { ListRecruitmentRequestsQueryDto } from './dto/list-recruitment-requests-query.dto';
import type { UpdateRecruitmentRequestDto } from './dto/update-recruitment-request.dto';
import type {
  RecruitmentRequestActor,
  RecruitmentRequestItem,
} from './recruitment-requests.types';

type RecruitmentRequestRecord = Prisma.RecruitmentRequestGetPayload<{
  include: {
    restaurant: { select: { id: true; name: true } };
    createdByUser: { select: { id: true; name: true; email: true } };
    handledByUser: { select: { id: true; name: true; email: true } };
  };
}>;

@Injectable()
export class RecruitmentRequestsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createRequest(
    actor: RecruitmentRequestActor,
    dto: CreateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestItem> {
    const request = await this.prismaService.recruitmentRequest.create({
      data: {
        restaurantId: actor.restaurantId,
        createdByUserId: actor.id,
        contractType: dto.contractType,
        position: dto.position,
        headcount: dto.headcount,
        notes: this.normalizeOptionalText(dto.notes),
      },
      include: this.getRequestIncludes(),
    });

    return this.mapRequest(request);
  }

  async listRequests(
    actor: RecruitmentRequestActor,
    query: ListRecruitmentRequestsQueryDto,
  ): Promise<RecruitmentRequestItem[]> {
    const where: Prisma.RecruitmentRequestWhereInput = {};

    if (!this.canManageRequests(actor)) {
      where.restaurantId = actor.restaurantId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const requests = await this.prismaService.recruitmentRequest.findMany({
      where,
      include: this.getRequestIncludes(),
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    return requests.map((request) => this.mapRequest(request));
  }

  async updateRequest(
    actor: RecruitmentRequestActor,
    id: number,
    dto: UpdateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestItem> {
    this.assertCanManageRequests(actor);

    const currentRequest =
      await this.prismaService.recruitmentRequest.findUnique({
        where: { id },
        select: { id: true },
      });

    if (!currentRequest) {
      throw new NotFoundException('RECRUITMENT_REQUEST_NOT_FOUND');
    }

    const status = dto.status;
    const request = await this.prismaService.recruitmentRequest.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(dto.handledNotes !== undefined
          ? { handledNotes: this.normalizeOptionalText(dto.handledNotes) }
          : {}),
        ...(status === 'completed'
          ? { handledByUserId: actor.id, handledAt: new Date() }
          : {}),
        ...(status && status !== 'completed'
          ? { handledByUserId: null, handledAt: null }
          : {}),
      },
      include: this.getRequestIncludes(),
    });

    return this.mapRequest(request);
  }

  async deleteRequest(
    actor: RecruitmentRequestActor,
    id: number,
  ): Promise<{ id: number }> {
    const request = await this.prismaService.recruitmentRequest.findUnique({
      where: { id },
      select: { id: true, createdByUserId: true },
    });

    if (!request) {
      throw new NotFoundException('RECRUITMENT_REQUEST_NOT_FOUND');
    }

    const isCreator = request.createdByUserId === actor.id;
    const canManage = this.canManageRequests(actor);

    if (!isCreator && !canManage) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    await this.prismaService.recruitmentRequest.delete({
      where: { id },
    });

    return { id };
  }

  private assertCanManageRequests(actor: RecruitmentRequestActor): void {
    if (!this.canManageRequests(actor)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }
  }

  private canManageRequests(actor: RecruitmentRequestActor): boolean {
    return actor.permissions.includes(RECRUITMENT_REQUEST_PERMISSIONS.manage);
  }

  private getRequestIncludes(): {
    restaurant: { select: { id: true; name: true } };
    createdByUser: { select: { id: true; name: true; email: true } };
    handledByUser: { select: { id: true; name: true; email: true } };
  } {
    return {
      restaurant: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
      handledByUser: { select: { id: true, name: true, email: true } },
    };
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const trimmedValue = value?.trim();

    return trimmedValue || null;
  }

  private mapRequest(
    request: RecruitmentRequestRecord,
  ): RecruitmentRequestItem {
    return {
      id: request.id,
      restaurantId: request.restaurantId,
      restaurantName: request.restaurant.name,
      createdBy: {
        id: request.createdByUser.id,
        name: request.createdByUser.name,
        email: request.createdByUser.email,
      },
      contractType:
        request.contractType as RecruitmentRequestItem['contractType'],
      position: request.position as RecruitmentRequestItem['position'],
      headcount: request.headcount,
      notes: request.notes,
      status: request.status as RecruitmentRequestItem['status'],
      handledNotes: request.handledNotes,
      handledBy: request.handledByUser
        ? {
            id: request.handledByUser.id,
            name: request.handledByUser.name,
            email: request.handledByUser.email,
          }
        : null,
      handledAt: request.handledAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }
}

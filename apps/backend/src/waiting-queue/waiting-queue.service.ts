import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateWaitingQueueEntryDto } from './dto/create-waiting-queue-entry.dto';
import type { ListWaitingQueueQueryDto } from './dto/list-waiting-queue-query.dto';
import type { UpdateWaitingQueueEntryStatusDto } from './dto/update-waiting-queue-entry-status.dto';
import type {
  WaitingQueueActor,
  WaitingQueueEntry,
} from './waiting-queue.types';

type WaitingQueueEntryRecord = Prisma.WaitingQueueEntryGetPayload<object>;

@Injectable()
export class WaitingQueueService {
  constructor(private readonly prismaService: PrismaService) {}

  async listEntries(
    actor: WaitingQueueActor,
    query: ListWaitingQueueQueryDto,
  ): Promise<WaitingQueueEntry[]> {
    const entries = await this.prismaService.waitingQueueEntry.findMany({
      where: {
        restaurantId: actor.restaurantId,
        status: query.status ?? 'waiting',
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return entries.map((entry) => this.mapEntry(entry));
  }

  async createEntry(
    actor: WaitingQueueActor,
    dto: CreateWaitingQueueEntryDto,
  ): Promise<WaitingQueueEntry> {
    const entry = await this.prismaService.waitingQueueEntry.create({
      data: {
        restaurantId: actor.restaurantId,
        createdByUserId: actor.id,
        customerName: dto.customerName.trim(),
        partySize: dto.partySize,
        hasDisabled: dto.hasDisabled ?? false,
        hasPregnant: dto.hasPregnant ?? false,
        hasElderly: dto.hasElderly ?? false,
        note: this.normalizeOptionalText(dto.note),
      },
    });

    return this.mapEntry(entry);
  }

  async updateEntryStatus(
    actor: WaitingQueueActor,
    id: number,
    dto: UpdateWaitingQueueEntryStatusDto,
  ): Promise<WaitingQueueEntry> {
    const currentEntry = await this.prismaService.waitingQueueEntry.findFirst({
      where: { id, restaurantId: actor.restaurantId },
      select: { id: true },
    });

    if (!currentEntry) {
      throw new NotFoundException('WAITING_QUEUE_ENTRY_NOT_FOUND');
    }

    const entry = await this.prismaService.waitingQueueEntry.update({
      where: { id },
      data: {
        status: dto.status,
        seatedAt: dto.status === 'seated' ? new Date() : null,
      },
    });

    return this.mapEntry(entry);
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const trimmedValue = value?.trim();

    return trimmedValue || null;
  }

  private mapEntry(entry: WaitingQueueEntryRecord): WaitingQueueEntry {
    return {
      id: entry.id,
      restaurantId: entry.restaurantId,
      customerName: entry.customerName,
      partySize: entry.partySize,
      hasDisabled: entry.hasDisabled,
      hasPregnant: entry.hasPregnant,
      hasElderly: entry.hasElderly,
      note: entry.note,
      status: entry.status as WaitingQueueEntry['status'],
      seatedAt: entry.seatedAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    };
  }
}

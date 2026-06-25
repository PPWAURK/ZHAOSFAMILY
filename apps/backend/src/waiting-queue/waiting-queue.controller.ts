import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { CreateWaitingQueueEntryDto } from './dto/create-waiting-queue-entry.dto';
import { ListWaitingQueueQueryDto } from './dto/list-waiting-queue-query.dto';
import { UpdateWaitingQueueEntryStatusDto } from './dto/update-waiting-queue-entry-status.dto';
import { WaitingQueueService } from './waiting-queue.service';
import type {
  WaitingQueueActor,
  WaitingQueueEntry,
} from './waiting-queue.types';

@Controller('waiting-queue')
export class WaitingQueueController {
  constructor(
    private readonly authService: AuthService,
    private readonly waitingQueueService: WaitingQueueService,
  ) {}

  @Get()
  async listEntries(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListWaitingQueueQueryDto,
  ): Promise<WaitingQueueEntry[]> {
    return this.waitingQueueService.listEntries(
      await this.getActor(authorization),
      query,
    );
  }

  @Post()
  async createEntry(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateWaitingQueueEntryDto,
  ): Promise<WaitingQueueEntry> {
    return this.waitingQueueService.createEntry(
      await this.getActor(authorization),
      dto,
    );
  }

  @Patch(':id')
  async updateEntryStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWaitingQueueEntryStatusDto,
  ): Promise<WaitingQueueEntry> {
    return this.waitingQueueService.updateEntryStatus(
      await this.getActor(authorization),
      id,
      dto,
    );
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<WaitingQueueActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return {
      id: user.id,
      restaurantId: user.restaurantId,
    };
  }
}

import {
  Body,
  Controller,
  Delete,
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
import { BatchDeleteRecruitmentRequestDto } from './dto/batch-delete-recruitment-request.dto';
import { CreateRecruitmentRequestDto } from './dto/create-recruitment-request.dto';
import { ListRecruitmentRequestsQueryDto } from './dto/list-recruitment-requests-query.dto';
import { UpdateRecruitmentRequestDto } from './dto/update-recruitment-request.dto';
import { RecruitmentRequestsService } from './recruitment-requests.service';
import type {
  RecruitmentRequestActor,
  RecruitmentRequestItem,
} from './recruitment-requests.types';

@Controller('recruitment-requests')
export class RecruitmentRequestsController {
  constructor(
    private readonly authService: AuthService,
    private readonly recruitmentRequestsService: RecruitmentRequestsService,
  ) {}

  @Post()
  async createRequest(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestItem> {
    return this.recruitmentRequestsService.createRequest(
      await this.getActor(authorization),
      dto,
    );
  }

  @Get()
  async listRequests(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListRecruitmentRequestsQueryDto,
  ): Promise<RecruitmentRequestItem[]> {
    return this.recruitmentRequestsService.listRequests(
      await this.getActor(authorization),
      query,
    );
  }

  @Patch(':id')
  async updateRequest(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecruitmentRequestDto,
  ): Promise<RecruitmentRequestItem> {
    return this.recruitmentRequestsService.updateRequest(
      await this.getActor(authorization),
      id,
      dto,
    );
  }

  @Post('batch-delete')
  async batchDeleteRequests(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: BatchDeleteRecruitmentRequestDto,
  ): Promise<{ deletedCount: number }> {
    return this.recruitmentRequestsService.batchDeleteRequests(
      await this.getActor(authorization),
      dto.ids,
    );
  }

  @Delete(':id')
  async deleteRequest(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.recruitmentRequestsService.deleteRequest(
      await this.getActor(authorization),
      id,
    );
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<RecruitmentRequestActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return {
      id: user.id,
      restaurantId: user.restaurantId,
      permissions: user.permissions,
    };
  }
}

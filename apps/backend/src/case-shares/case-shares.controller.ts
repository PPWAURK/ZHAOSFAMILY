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
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  CASE_SHARE_PERMISSIONS,
  RequirePermissions,
} from '../auth/permissions';
import { CaseSharesService } from './case-shares.service';
import { CreateCaseShareDto } from './dto/create-case-share.dto';
import { CreateCaseShareCommentDto } from './dto/create-case-share-comment.dto';
import { ListCaseSharesQueryDto } from './dto/list-case-shares-query.dto';
import { ListMyCaseSharesQueryDto } from './dto/list-my-case-shares-query.dto';
import { ReviewCaseShareDto } from './dto/review-case-share.dto';
import type {
  CaseShareActor,
  CaseShareAuthorProfile,
  CaseShareCommentItem,
  CaseShareItem,
  PaginatedCaseShareComments,
  PaginatedCaseShares,
} from './case-shares.types';

@Controller('case-shares')
@UseGuards(PermissionGuard)
export class CaseSharesController {
  constructor(
    private readonly authService: AuthService,
    private readonly caseSharesService: CaseSharesService,
  ) {}

  @Get()
  async listPublic(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    return this.caseSharesService.listPublic(
      await this.getActor(authorization),
      query,
    );
  }

  @Get('mine')
  async listMine(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListMyCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    return this.caseSharesService.listMine(
      await this.getActor(authorization),
      query,
    );
  }

  @Get('review/pending')
  @RequirePermissions(CASE_SHARE_PERMISSIONS.review)
  async listPending(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShares> {
    return this.caseSharesService.listPending(
      await this.getActor(authorization),
      query,
    );
  }

  @Get('authors/:authorId')
  async getAuthorProfile(
    @Headers('authorization') authorization: string | undefined,
    @Param('authorId', ParseIntPipe) authorId: number,
  ): Promise<CaseShareAuthorProfile> {
    await this.getActor(authorization);

    return this.caseSharesService.getAuthorProfile(authorId);
  }

  @Get(':id')
  async getDetail(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CaseShareItem> {
    return this.caseSharesService.getDetail(
      await this.getActor(authorization),
      id,
    );
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateCaseShareDto,
  ): Promise<CaseShareItem> {
    return this.caseSharesService.create(
      await this.getActor(authorization),
      dto,
    );
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number }> {
    return this.caseSharesService.remove(
      await this.getActor(authorization),
      id,
    );
  }

  @Patch(':id/review')
  @RequirePermissions(CASE_SHARE_PERMISSIONS.review)
  async review(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewCaseShareDto,
  ): Promise<CaseShareItem> {
    return this.caseSharesService.review(
      await this.getActor(authorization),
      id,
      dto,
    );
  }

  @Get(':id/comments')
  async listComments(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListCaseSharesQueryDto,
  ): Promise<PaginatedCaseShareComments> {
    return this.caseSharesService.listComments(
      await this.getActor(authorization),
      id,
      query,
    );
  }

  @Post(':id/comments')
  async createComment(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCaseShareCommentDto,
  ): Promise<CaseShareCommentItem> {
    return this.caseSharesService.createComment(
      await this.getActor(authorization),
      id,
      dto,
    );
  }

  @Post(':id/like')
  async like(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CaseShareItem> {
    return this.caseSharesService.like(await this.getActor(authorization), id);
  }

  @Delete(':id/like')
  async unlike(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CaseShareItem> {
    return this.caseSharesService.unlike(
      await this.getActor(authorization),
      id,
    );
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<CaseShareActor> {
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

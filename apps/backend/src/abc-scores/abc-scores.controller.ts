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
import { ABC_SCORE_PERMISSIONS, RequirePermissions } from '../auth/permissions';
import { AbcScoresService } from './abc-scores.service';
import { AttachMediaDto } from './dto/attach-media.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { FillOperationsScoreDto } from './dto/fill-operations-score.dto';
import { FillScoreDto } from './dto/fill-score.dto';
import { ListCyclesQueryDto } from './dto/list-cycles-query.dto';
import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcLeaderboard,
  AbcProgress,
  AbcScoreActor,
  AbcStoreScoreItem,
} from './abc-scores.types';

@Controller('abc-scores')
@UseGuards(PermissionGuard)
export class AbcScoresController {
  constructor(
    private readonly authService: AuthService,
    private readonly abcScoresService: AbcScoresService,
  ) {}

  // 首页排行榜：任何已登录用户可见，不要求 abc.score.read。
  @Get('published')
  async getPublished(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<AbcLeaderboard | null> {
    await this.getActor(authorization);
    return this.abcScoresService.getPublishedLeaderboard();
  }

  @Get('cycles')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.read)
  listCycles(@Query() query: ListCyclesQueryDto): Promise<AbcCycleSummary[]> {
    return this.abcScoresService.listCycles(query);
  }

  @Post('cycles')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.publish)
  createCycle(@Body() dto: CreateCycleDto): Promise<AbcCycleSummary> {
    return this.abcScoresService.createCycle(dto);
  }

  @Get('cycles/:id')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.read)
  getCycle(@Param('id', ParseIntPipe) id: number): Promise<AbcCycleDetail> {
    return this.abcScoresService.getCycleDetail(id);
  }

  @Get('cycles/:id/progress')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.read)
  getProgress(@Param('id', ParseIntPipe) id: number): Promise<AbcProgress> {
    return this.abcScoresService.getProgress(id);
  }

  @Get('cycles/:id/preview')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.read)
  getPreview(@Param('id', ParseIntPipe) id: number): Promise<AbcLeaderboard> {
    return this.abcScoresService.getLeaderboard(id);
  }

  @Patch('cycles/:id/stores/:restaurantId/marketing')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.fillMarketing)
  async fillMarketing(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: FillScoreDto,
  ): Promise<AbcStoreScoreItem> {
    return this.abcScoresService.fillMarketingScore(
      await this.getActor(authorization),
      id,
      restaurantId,
      dto,
    );
  }

  @Patch('cycles/:id/stores/:restaurantId/operations')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.fillOperations)
  async fillOperations(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: FillOperationsScoreDto,
  ): Promise<AbcStoreScoreItem> {
    return this.abcScoresService.fillOperationsScore(
      await this.getActor(authorization),
      id,
      restaurantId,
      dto,
    );
  }

  @Post('cycles/:id/stores/:restaurantId/media')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.fillOperations)
  async attachMedia(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: AttachMediaDto,
  ): Promise<AbcStoreScoreItem> {
    return this.abcScoresService.attachMedia(
      await this.getActor(authorization),
      id,
      restaurantId,
      dto,
    );
  }

  @Post('cycles/:id/publish')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.publish)
  publishCycle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AbcCycleSummary> {
    return this.abcScoresService.publishCycle(id);
  }

  @Delete('cycles/:id')
  @RequirePermissions(ABC_SCORE_PERMISSIONS.publish)
  deleteCycle(@Param('id', ParseIntPipe) id: number): Promise<{ id: number }> {
    return this.abcScoresService.deleteCycle(id);
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<AbcScoreActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return { id: user.id, permissions: user.permissions };
  }
}

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
  ABC_INSPECTION_PERMISSIONS,
  ABC_LEGACY_SCORE_PERMISSIONS,
  RequireAnyPermissions,
} from '../auth/permissions';
import { AbcScoresService } from './abc-scores.service';
import { AttachMediaDto } from './dto/attach-media.dto';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { RecordInspectionDto } from './dto/fill-operations-score.dto';
import { ListCyclesQueryDto } from './dto/list-cycles-query.dto';
import type {
  AbcCycleDetail,
  AbcCycleSummary,
  AbcGradeDirectory,
  AbcInspectionProgress,
  AbcPublicGradeBoard,
  AbcScoreActor,
  AbcStoreInspectionItem,
} from './abc-scores.types';

@Controller('abc-scores')
@UseGuards(PermissionGuard)
export class AbcScoresController {
  constructor(
    private readonly authService: AuthService,
    private readonly abcScoresService: AbcScoresService,
  ) {}

  @Get('published')
  getPublishedGradeBoard(): Promise<AbcPublicGradeBoard | null> {
    return this.abcScoresService.getPublishedGradeBoard();
  }

  @Get('published/cycles')
  listPublishedGradeCycles(): Promise<AbcCycleSummary[]> {
    return this.abcScoresService.listPublishedGradeCycles();
  }

  @Get('published/:id')
  getPublishedGradeBoardByCycle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AbcPublicGradeBoard | null> {
    return this.abcScoresService.getPublishedGradeBoard(id);
  }

  @Get('cycles')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.read,
    ABC_LEGACY_SCORE_PERMISSIONS.read,
  )
  listCycles(@Query() query: ListCyclesQueryDto): Promise<AbcCycleSummary[]> {
    return this.abcScoresService.listCycles(query);
  }

  @Post('cycles')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.publish,
    ABC_LEGACY_SCORE_PERMISSIONS.publish,
  )
  createCycle(@Body() dto: CreateCycleDto): Promise<AbcCycleSummary> {
    return this.abcScoresService.createCycle(dto);
  }

  @Get('cycles/:id')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.read,
    ABC_LEGACY_SCORE_PERMISSIONS.read,
  )
  getCycle(@Param('id', ParseIntPipe) id: number): Promise<AbcCycleDetail> {
    return this.abcScoresService.getCycleDetail(id);
  }

  @Get('cycles/:id/progress')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.read,
    ABC_LEGACY_SCORE_PERMISSIONS.read,
  )
  getProgress(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AbcInspectionProgress> {
    return this.abcScoresService.getProgress(id);
  }

  @Get('cycles/:id/overview')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.read,
    ABC_LEGACY_SCORE_PERMISSIONS.read,
  )
  getGradeDirectory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AbcGradeDirectory> {
    return this.abcScoresService.getGradeDirectory(id);
  }

  @Patch('cycles/:id/stores/:restaurantId/inspection')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.manage,
    ABC_LEGACY_SCORE_PERMISSIONS.manage,
  )
  async recordInspection(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: RecordInspectionDto,
  ): Promise<AbcStoreInspectionItem> {
    return this.abcScoresService.recordInspection(
      await this.getActor(authorization),
      id,
      restaurantId,
      dto,
    );
  }

  @Post('cycles/:id/stores/:restaurantId/media')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.manage,
    ABC_LEGACY_SCORE_PERMISSIONS.manage,
  )
  async attachMedia(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() dto: AttachMediaDto,
  ): Promise<AbcStoreInspectionItem> {
    return this.abcScoresService.attachMedia(
      await this.getActor(authorization),
      id,
      restaurantId,
      dto,
    );
  }

  @Post('cycles/:id/publish')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.publish,
    ABC_LEGACY_SCORE_PERMISSIONS.publish,
  )
  publishCycle(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AbcCycleSummary> {
    return this.abcScoresService.publishCycle(id);
  }

  @Delete('cycles/:id')
  @RequireAnyPermissions(
    ABC_INSPECTION_PERMISSIONS.publish,
    ABC_LEGACY_SCORE_PERMISSIONS.publish,
  )
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

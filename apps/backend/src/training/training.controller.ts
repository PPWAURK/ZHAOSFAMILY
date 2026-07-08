import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Public } from '../auth/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  RequireAnyPermissions,
  RequirePermissions,
  SCREEN_SECURITY_PERMISSIONS,
  TRAINING_BADGE_PERMISSIONS,
  TRAINING_MATERIAL_PERMISSIONS,
  TRAINING_POSITION_PERMISSIONS,
  TRAINING_TITLE_PERMISSIONS,
  SYSTEM_PERMISSIONS,
} from '../auth/permissions';
import { SetBadgeImageDto } from './dto/set-badge-image.dto';
import { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import { CreateTrainingPositionDto } from './dto/create-training-position.dto';
import { CreateTrainingTitleDto } from './dto/create-training-title.dto';
import { EquipTrainingTitleDto } from './dto/equip-training-title.dto';
import { ListTrainingCoursesQueryDto } from './dto/list-training-courses-query.dto';
import { ListTrainingMaterialsQueryDto } from './dto/list-training-materials-query.dto';
import { CreateScreenSecurityEventDto } from './dto/create-screenshot-event.dto';
import { DeleteScreenSecurityEventsDto } from './dto/delete-screen-security-events.dto';
import { ListScreenSecurityEventsQueryDto } from './dto/list-screen-security-events-query.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateTrainingBadgeRequirementsDto } from './dto/update-training-badge-requirements.dto';
import { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';
import { UpsertJobRolePositionDto } from './dto/upsert-job-role-position.dto';
import { ScreenSecurityEventService } from './screenshot-event.service';
import { TrainingService } from './training.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingBadgeService } from './training-badge.service';
import { TrainingMonthlyReportService } from './training-monthly-report.service';
import { TrainingTitleService } from './training-title.service';
import type {
  TrainingDiagnostics,
  TrainingBadgeItem,
  TrainingCourseItem,
  TrainingMonthlyReport,
  TrainingMyBadges,
  TrainingJobRolePositionItem,
  TrainingMaterialItem,
  TrainingMaterialProgressItem,
  TrainingMyPlan,
  TrainingMyRecords,
  TrainingMyTitles,
  TrainingPositionItem,
  TrainingQuizAttemptResult,
  TrainingQuizForTaking,
  TrainingResolvePreview,
  TrainingStoreProgress,
  TrainingTitleItem,
  TrainingTitleRecipient,
} from './training.types';

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new BadRequestException('INVALID_RESTAURANT_ID');
  }

  return parsed;
}

@Controller('training')
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly quizService: TrainingQuizService,
    private readonly badgeService: TrainingBadgeService,
    private readonly monthlyReportService: TrainingMonthlyReportService,
    private readonly titleService: TrainingTitleService,
    private readonly screenSecurityEventService: ScreenSecurityEventService,
    private readonly authService: AuthService,
  ) {}

  @Get('courses')
  listCourses(
    @Query() query: ListTrainingCoursesQueryDto,
  ): TrainingCourseItem[] {
    return this.trainingService.listCourses(query);
  }

  @Get('courses/:id')
  getCourse(@Param('id') id: string): TrainingCourseItem {
    return this.trainingService.getCourse(id);
  }

  @Get('positions')
  listPositions(): Promise<TrainingPositionItem[]> {
    return this.trainingService.listPositions();
  }

  @Get('positions/manage')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  listManagedPositions(): Promise<TrainingPositionItem[]> {
    return this.trainingService.listManagedPositions();
  }

  @Post('positions')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  createPosition(
    @Body() dto: CreateTrainingPositionDto,
  ): Promise<TrainingPositionItem> {
    return this.trainingService.createPosition(dto);
  }

  @Patch('positions/:code')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  updatePosition(
    @Param('code') code: string,
    @Body() dto: UpdateTrainingPositionDto,
  ): Promise<TrainingPositionItem> {
    return this.trainingService.updatePosition(code, dto);
  }

  @Delete('positions/:code')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  deletePosition(
    @Param('code') code: string,
  ): Promise<{ message: 'TRAINING_POSITION_DELETED' }> {
    return this.trainingService.deletePosition(code);
  }

  @Get('job-role-positions')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  listJobRolePositions(): Promise<TrainingJobRolePositionItem[]> {
    return this.trainingService.listJobRolePositions();
  }

  @Put('job-role-positions/:jobRole')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  upsertJobRolePosition(
    @Param('jobRole') jobRole: string,
    @Body() dto: UpsertJobRolePositionDto,
  ): Promise<TrainingJobRolePositionItem> {
    return this.trainingService.upsertJobRolePosition(jobRole, dto);
  }

  @Delete('job-role-positions/:jobRole')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  deleteJobRolePosition(
    @Param('jobRole') jobRole: string,
  ): Promise<{ message: 'TRAINING_JOB_ROLE_POSITION_DELETED' }> {
    return this.trainingService.deleteJobRolePosition(jobRole);
  }

  @Get('diagnostics')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  getDiagnostics(): Promise<TrainingDiagnostics> {
    return this.trainingService.getDiagnostics();
  }

  @Get('resolve-preview')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_POSITION_PERMISSIONS.manage)
  getResolvePreview(
    @Query('jobRole') jobRole?: string,
  ): Promise<TrainingResolvePreview> {
    return this.trainingService.getResolvePreview(jobRole ?? null);
  }

  @Get('badges/my')
  async getMyBadges(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingMyBadges> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.badgeService.getMyBadges(user.id);
  }

  @Get('badges')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_BADGE_PERMISSIONS.manage)
  listBadges(): Promise<TrainingBadgeItem[]> {
    return this.badgeService.listBadges();
  }

  @Put('badges/:code/requirements')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_BADGE_PERMISSIONS.manage)
  updateBadgeRequirements(
    @Param('code') code: string,
    @Body() dto: UpdateTrainingBadgeRequirementsDto,
  ): Promise<TrainingBadgeItem> {
    return this.badgeService.updateRequirements(code, dto.materialIds);
  }

  @Public()
  @Get('badges/svg/:filename')
  getBadgeSvg(@Param('filename') filename: string, @Res() res: Response): void {
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', 'badges', safeName);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ message: 'SVG_NOT_FOUND' });
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  }

  @Public()
  @Get('badges/svg-files')
  listBadgeSvgFiles(): string[] {
    const dir = path.join(process.cwd(), 'uploads', 'badges');

    if (!fs.existsSync(dir)) return [];

    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.svg'))
      .sort();
  }

  @Patch('badges/:code/image')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_BADGE_PERMISSIONS.manage)
  updateBadgeImage(
    @Param('code') code: string,
    @Body() dto: SetBadgeImageDto,
  ): Promise<TrainingBadgeItem> {
    return this.badgeService.updateBadgeImage(code, dto.imageFileName);
  }

  @Get('reports/monthly')
  async getMonthlyReport(
    @Headers('authorization') authorization: string | undefined,
    @Query('month') month?: string,
    @Query('restaurantId') restaurantId?: string,
  ): Promise<TrainingMonthlyReport> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.monthlyReportService.getMonthlyReport(
      {
        id: user.id,
        jobRole: user.jobRole,
        restaurantId: user.restaurantId,
        store: user.store,
      },
      month,
      parseOptionalInteger(restaurantId),
    );
  }

  @Get('materials')
  listMaterials(
    @Query() query: ListTrainingMaterialsQueryDto,
  ): Promise<TrainingMaterialItem[]> {
    return this.trainingService.listMaterials(query);
  }

  @Get('materials/:id')
  getMaterial(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TrainingMaterialItem> {
    return this.trainingService.getMaterial(id);
  }

  @Get('progress')
  async listMyProgress(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingMaterialProgressItem[]> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.trainingService.listProgressForUser(user.id);
  }

  @Get('my-plan')
  async getMyPlan(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingMyPlan> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.trainingService.getMyPlan({
      id: user.id,
      jobRole: user.jobRole,
    });
  }

  @Get('store-progress')
  async getStoreProgress(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingStoreProgress> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.trainingService.getStoreProgress({
      id: user.id,
      jobRole: user.jobRole,
      restaurantId: user.restaurantId,
      store: user.store,
      permissions: user.permissions,
    });
  }

  @Patch('materials/:id/progress')
  async updateProgress(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainingProgressDto,
  ): Promise<TrainingMaterialProgressItem> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.trainingService.updateProgress(user.id, id, dto);
  }

  @Get('materials/:id/quiz')
  async getMaterialQuiz(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TrainingQuizForTaking> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.quizService.getQuizForMaterial(user.id, id);
  }

  @Post('materials/:id/quiz/attempts')
  async submitMaterialQuiz(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitQuizAttemptDto,
  ): Promise<TrainingQuizAttemptResult> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.quizService.submitAttempt(user.id, id, dto);
  }

  @Get('my-titles')
  async getMyTitles(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingMyTitles> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.titleService.getMyTitles(user.id);
  }

  @Put('my-titles/equipped')
  async equipMyTitle(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: EquipTrainingTitleDto,
  ): Promise<TrainingMyTitles> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.titleService.equipTitleForUser(user.id, dto.code);
  }

  @Get('titles')
  @UseGuards(PermissionGuard)
  @RequireAnyPermissions(
    TRAINING_TITLE_PERMISSIONS.manage,
    SYSTEM_PERMISSIONS.managePermissions,
    TRAINING_BADGE_PERMISSIONS.manage,
  )
  listTitles(): Promise<TrainingTitleItem[]> {
    return this.titleService.listTitles();
  }

  @Post('titles')
  @UseGuards(PermissionGuard)
  @RequireAnyPermissions(
    TRAINING_TITLE_PERMISSIONS.manage,
    SYSTEM_PERMISSIONS.managePermissions,
    TRAINING_BADGE_PERMISSIONS.manage,
  )
  createTitle(@Body() dto: CreateTrainingTitleDto): Promise<TrainingTitleItem> {
    return this.titleService.createTitle(dto);
  }

  @Get('titles/recipients')
  @UseGuards(PermissionGuard)
  @RequireAnyPermissions(
    TRAINING_TITLE_PERMISSIONS.manage,
    SYSTEM_PERMISSIONS.managePermissions,
    TRAINING_BADGE_PERMISSIONS.manage,
  )
  listTitleRecipients(): Promise<TrainingTitleRecipient[]> {
    return this.titleService.listRecipients();
  }

  @Post('titles/:code/users/:userId')
  @UseGuards(PermissionGuard)
  @RequireAnyPermissions(
    TRAINING_TITLE_PERMISSIONS.manage,
    SYSTEM_PERMISSIONS.managePermissions,
    TRAINING_BADGE_PERMISSIONS.manage,
  )
  assignTitleToUser(
    @Param('code') code: string,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<TrainingTitleItem> {
    return this.titleService.assignTitleToUser(userId, code);
  }

  @Delete('titles/:code/users/:userId')
  @UseGuards(PermissionGuard)
  @RequireAnyPermissions(
    TRAINING_TITLE_PERMISSIONS.manage,
    SYSTEM_PERMISSIONS.managePermissions,
    TRAINING_BADGE_PERMISSIONS.manage,
  )
  revokeTitleFromUser(
    @Param('code') code: string,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ message: 'TRAINING_TITLE_REVOKED' }> {
    return this.titleService.revokeTitleFromUser(userId, code);
  }

  @Get('my-records')
  async getMyRecords(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<TrainingMyRecords> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return this.quizService.getMyRecords(user.id);
  }

  @Post('materials')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.create)
  createMaterial(
    @Body() dto: CreateTrainingMaterialDto,
  ): Promise<TrainingMaterialItem> {
    return this.trainingService.createMaterial(dto);
  }

  @Patch('materials/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.update)
  updateMaterial(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTrainingMaterialDto,
  ): Promise<TrainingMaterialItem> {
    return this.trainingService.updateMaterial(id, dto);
  }

  @Delete('materials/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(TRAINING_MATERIAL_PERMISSIONS.delete)
  deleteMaterial(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: 'TRAINING_MATERIAL_DELETED' }> {
    return this.trainingService.deleteMaterial(id);
  }

  @Post('screen-security-events')
  async recordScreenSecurityEvent(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateScreenSecurityEventDto,
  ): Promise<{ message: 'SCREEN_SECURITY_EVENT_RECORDED' }> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    await this.screenSecurityEventService.record(user.id, dto);

    return { message: 'SCREEN_SECURITY_EVENT_RECORDED' };
  }

  @Get('screen-security-events')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCREEN_SECURITY_PERMISSIONS.audit)
  listScreenSecurityEvents(@Query() query: ListScreenSecurityEventsQueryDto) {
    return this.screenSecurityEventService.list(query);
  }

  @Delete('screen-security-events')
  @UseGuards(PermissionGuard)
  @RequirePermissions(SCREEN_SECURITY_PERMISSIONS.delete)
  async deleteScreenSecurityEvents(
    @Body() dto: DeleteScreenSecurityEventsDto,
  ): Promise<{ message: string; deletedCount: number }> {
    const deletedCount = await this.screenSecurityEventService.deleteMany(
      dto.ids,
    );

    return {
      message: 'SCREEN_SECURITY_EVENTS_DELETED',
      deletedCount,
    };
  }
}

import {
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
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
  RequirePermissions,
  TRAINING_MATERIAL_PERMISSIONS,
  TRAINING_POSITION_PERMISSIONS,
} from '../auth/permissions';
import { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import { CreateTrainingPositionDto } from './dto/create-training-position.dto';
import { ListTrainingCoursesQueryDto } from './dto/list-training-courses-query.dto';
import { ListTrainingMaterialsQueryDto } from './dto/list-training-materials-query.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';
import { UpsertJobRolePositionDto } from './dto/upsert-job-role-position.dto';
import { TrainingService } from './training.service';
import { TrainingQuizService } from './training-quiz.service';
import { TrainingTitleService } from './training-title.service';
import type {
  TrainingDiagnostics,
  TrainingCourseItem,
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
} from './training.types';

@Controller('training')
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly quizService: TrainingQuizService,
    private readonly titleService: TrainingTitleService,
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
}

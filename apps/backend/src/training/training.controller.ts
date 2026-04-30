import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import { TrainingService } from './training.service';
import type {
  TrainingCourseItem,
  TrainingMaterialItem,
  TrainingPositionItem,
} from './training.types';

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

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

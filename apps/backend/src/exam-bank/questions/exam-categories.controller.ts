import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import {
  EXAM_PERMISSIONS,
  RequireAnyPermissions,
  RequirePermissions,
} from '../../auth/permissions';
import type { ExamCategoryView } from '../exam-bank.types';
import {
  CreateExamCategoryDto,
  UpdateExamCategoryDto,
} from './dto/category.dto';
import { ExamCategoriesService } from './exam-categories.service';

@Controller('exam-bank/categories')
@UseGuards(PermissionGuard)
export class ExamCategoriesController {
  constructor(private readonly categories: ExamCategoriesService) {}

  @Get()
  @RequireAnyPermissions(
    EXAM_PERMISSIONS.manageBank,
    EXAM_PERMISSIONS.viewResults,
  )
  list(): Promise<ExamCategoryView[]> {
    return this.categories.list();
  }

  @Post()
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  create(@Body() dto: CreateExamCategoryDto): Promise<ExamCategoryView> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamCategoryDto,
  ): Promise<ExamCategoryView> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categories.remove(id);
  }
}

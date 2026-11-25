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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import {
  EXAM_PERMISSIONS,
  RequireAnyPermissions,
  RequirePermissions,
} from '../../auth/permissions';
import {
  CreateExamTemplateDto,
  ExamPoolConfigDto,
  UpdateExamTemplateDto,
} from './dto/exam-template.dto';
import type { ExamTemplateView } from './exam-template.view';
import { ExamTemplatesService } from './exam-templates.service';
import type { PoolCheckView } from './template-pool';
import { ExamBlueprintDto } from '../blueprint/dto/exam-blueprint.dto';
import type { BlueprintCheckView } from '../blueprint/exam-blueprint.service';

@Controller('exam-bank/templates')
@UseGuards(PermissionGuard)
export class ExamTemplatesController {
  constructor(private readonly templates: ExamTemplatesService) {}

  @Get()
  @RequireAnyPermissions(
    EXAM_PERMISSIONS.manageBank,
    EXAM_PERMISSIONS.viewResults,
  )
  list(): Promise<ExamTemplateView[]> {
    return this.templates.list();
  }

  @Post('pool-check')
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  poolCheck(@Body() dto: ExamPoolConfigDto): Promise<PoolCheckView> {
    return this.templates.poolCheck(dto);
  }

  /** Per-file and per-difficulty coverage of a sectioned paper. */
  @Post('blueprint-check')
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  blueprintCheck(@Body() dto: ExamBlueprintDto): Promise<BlueprintCheckView> {
    return this.templates.blueprintCheck(dto);
  }

  @Post()
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateExamTemplateDto,
  ): Promise<ExamTemplateView> {
    return this.templates.create(dto, request.user!.id);
  }

  @Patch(':id')
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamTemplateDto,
  ): Promise<ExamTemplateView> {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions(EXAM_PERMISSIONS.manageBank)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.templates.remove(id);
  }
}

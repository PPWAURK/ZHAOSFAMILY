import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { EXAM_PERMISSIONS, RequirePermissions } from '../../auth/permissions';
import { CreateGenerationJobDto } from './dto/create-generation-job.dto';
import type {
  GenerationEstimateView,
  GenerationJobView,
} from './generation-job.view';
import { GenerationJobsService } from './generation-jobs.service';
import type { MaterialCoverageView } from './generation-planning.service';

@Controller('exam-bank/generation-jobs')
@UseGuards(PermissionGuard)
@RequirePermissions(EXAM_PERMISSIONS.manageBank)
export class GenerationJobsController {
  constructor(private readonly jobs: GenerationJobsService) {}

  @Post('estimate')
  estimate(
    @Body() dto: CreateGenerationJobDto,
  ): Promise<GenerationEstimateView> {
    return this.jobs.estimate(dto);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateGenerationJobDto,
  ): Promise<GenerationJobView> {
    return this.jobs.create(dto, request.user!.id);
  }

  /** Per-material targets and current bank counts by difficulty. */
  @Get('coverage')
  coverage(): Promise<MaterialCoverageView[]> {
    return this.jobs.coverage();
  }

  @Get()
  list(): Promise<GenerationJobView[]> {
    return this.jobs.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<GenerationJobView> {
    return this.jobs.get(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number): Promise<GenerationJobView> {
    return this.jobs.cancel(id);
  }
}

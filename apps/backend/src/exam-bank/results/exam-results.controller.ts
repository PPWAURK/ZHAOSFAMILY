import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { EXAM_PERMISSIONS, RequirePermissions } from '../../auth/permissions';
import type { Paginated } from '../exam-bank.types';
import { ListResultsQueryDto } from './dto/list-results-query.dto';
import type {
  ExamResultDetailView,
  ExamResultRowView,
  QuestionStatView,
} from './exam-results.view';
import { ExamResultsService } from './exam-results.service';

@Controller('exam-bank')
@UseGuards(PermissionGuard)
@RequirePermissions(EXAM_PERMISSIONS.viewResults)
export class ExamResultsController {
  constructor(private readonly results: ExamResultsService) {}

  @Get('results')
  list(
    @Query() query: ListResultsQueryDto,
  ): Promise<Paginated<ExamResultRowView>> {
    return this.results.list(query);
  }

  @Get('results/:attemptId')
  detail(
    @Param('attemptId', ParseIntPipe) attemptId: number,
  ): Promise<ExamResultDetailView> {
    return this.results.detail(attemptId);
  }

  @Get('templates/:id/question-stats')
  questionStats(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<QuestionStatView[]> {
    return this.results.questionStats(id);
  }
}

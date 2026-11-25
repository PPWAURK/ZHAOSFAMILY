import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { EXAM_PERMISSIONS, RequirePermissions } from '../../auth/permissions';
import type {
  ExamQuestionView,
  Paginated,
  QuestionStatsView,
} from '../exam-bank.types';
import { ListQuestionsQueryDto } from './dto/list-questions-query.dto';
import {
  CreateExamQuestionDto,
  UpdateExamQuestionDto,
} from './dto/question.dto';
import { BulkReviewDto, RejectQuestionDto } from './dto/review.dto';
import { QuestionReviewService } from './question-review.service';

@Controller('exam-bank/questions')
@UseGuards(PermissionGuard)
@RequirePermissions(EXAM_PERMISSIONS.manageBank)
export class QuestionReviewController {
  constructor(private readonly questions: QuestionReviewService) {}

  @Get()
  list(
    @Query() query: ListQuestionsQueryDto,
  ): Promise<Paginated<ExamQuestionView>> {
    return this.questions.list(query);
  }

  @Get('stats')
  stats(): Promise<QuestionStatsView> {
    return this.questions.stats();
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateExamQuestionDto,
  ): Promise<ExamQuestionView> {
    return this.questions.create(dto, request.user!.id);
  }

  @Post('bulk-review')
  bulkReview(
    @Req() request: AuthenticatedRequest,
    @Body() dto: BulkReviewDto,
  ): Promise<{ updated: number }> {
    return this.questions.bulkReview(dto, request.user!.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamQuestionDto,
  ): Promise<ExamQuestionView> {
    return this.questions.update(id, dto);
  }

  @Post(':id/approve')
  approve(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamQuestionView> {
    return this.questions.review(id, 'approve', request.user!.id);
  }

  @Post(':id/reject')
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectQuestionDto,
  ): Promise<ExamQuestionView> {
    return this.questions.review(id, 'reject', request.user!.id, dto.reason);
  }

  @Post(':id/archive')
  archive(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamQuestionView> {
    return this.questions.review(id, 'archive', request.user!.id);
  }
}

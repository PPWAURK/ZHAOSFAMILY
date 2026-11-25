import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import {
  ExamAnswersDto,
  StartExamSectionDto,
  SubmitExamAnswersDto,
} from './dto/exam-answers.dto';
import type { ExamAttemptView } from './exam-attempt.view';
import { ExamAttemptsService } from './exam-attempts.service';
import type { ExamCardView, MyAttemptView } from './exam-catalog.view';
import { ExamCatalogService } from './exam-catalog.service';
import { JoinExamSessionDto } from '../sessions/dto/exam-session.dto';
import { ExamSessionJoinService } from '../sessions/exam-session-join.service';

/** Employee routes: any signed-in user may take active exams. */
@Controller()
export class ExamsController {
  constructor(
    private readonly catalog: ExamCatalogService,
    private readonly attempts: ExamAttemptsService,
    private readonly sessionJoin: ExamSessionJoinService,
  ) {}

  /** Enter the examiner's 6-digit code to start or resume that session's paper. */
  @Post('exams/sessions/join')
  joinSession(
    @Req() request: AuthenticatedRequest,
    @Body() dto: JoinExamSessionDto,
  ): Promise<ExamAttemptView> {
    return this.sessionJoin.join(request.user!, dto.code);
  }

  @Get('exams')
  listExams(@Req() request: AuthenticatedRequest): Promise<ExamCardView[]> {
    return this.catalog.listAvailable(request.user!.id);
  }

  @Post('exams/:templateId/attempts')
  start(
    @Req() request: AuthenticatedRequest,
    @Param('templateId', ParseIntPipe) templateId: number,
  ): Promise<ExamAttemptView> {
    return this.attempts.start(request.user!, templateId);
  }

  @Get('exam-attempts/mine')
  listMine(@Req() request: AuthenticatedRequest): Promise<MyAttemptView[]> {
    return this.catalog.listMine(request.user!.id);
  }

  @Get('exam-attempts/:id')
  get(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamAttemptView> {
    return this.attempts.get(request.user!, id);
  }

  @Put('exam-attempts/:id/answers')
  saveAnswers(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExamAnswersDto,
  ): Promise<{ savedAt: string }> {
    return this.attempts.saveAnswers(request.user!, id, dto);
  }

  @Post('exam-attempts/:id/submit')
  submit(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitExamAnswersDto,
  ): Promise<ExamAttemptView> {
    return this.attempts.submit(request.user!, id, dto);
  }

  /** Sectioned papers: skip the rest of the break and start the next section. */
  @Post('exam-attempts/:id/sections/start')
  startSection(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartExamSectionDto,
  ): Promise<ExamAttemptView> {
    return this.attempts.startSection(request.user!, id, dto.sectionIndex);
  }
}

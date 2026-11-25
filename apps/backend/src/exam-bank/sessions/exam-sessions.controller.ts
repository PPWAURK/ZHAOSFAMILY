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
import {
  EXAM_PERMISSIONS,
  RequireAnyPermissions,
} from '../../auth/permissions';
import { CreateExamSessionDto } from './dto/exam-session.dto';
import type {
  ExamSessionDetailView,
  ExamSessionTemplateOption,
  ExamSessionView,
} from './exam-session.view';
import { ExamSessionsService } from './exam-sessions.service';

/** Examiner routes; ownership (own sessions vs all) is checked in the service. */
@Controller('exam-sessions')
@UseGuards(PermissionGuard)
@RequireAnyPermissions(
  EXAM_PERMISSIONS.manageSessions,
  EXAM_PERMISSIONS.manageBank,
)
export class ExamSessionsController {
  constructor(private readonly sessions: ExamSessionsService) {}

  @Get('templates')
  listTemplates(): Promise<ExamSessionTemplateOption[]> {
    return this.sessions.listTemplates();
  }

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<ExamSessionView[]> {
    return this.sessions.list(request.user!);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateExamSessionDto,
  ): Promise<ExamSessionView> {
    return this.sessions.create(request.user!, dto);
  }

  @Get(':id')
  detail(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamSessionDetailView> {
    return this.sessions.detail(request.user!, id);
  }

  @Post(':id/open')
  open(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamSessionDetailView> {
    return this.sessions.open(request.user!, id);
  }

  @Post(':id/close')
  close(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamSessionDetailView> {
    return this.sessions.close(request.user!, id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import {
  EXAM_PERMISSIONS,
  RequireAnyPermissions,
} from '../../auth/permissions';
import { AddExamRegistrationsDto } from './dto/exam-registration.dto';
import { CreateExamSessionDto } from './dto/exam-session.dto';
import { ExamSessionRegistrationsService } from './exam-session-registrations.service';
import type {
  ExamCandidateView,
  ExamRegistrationView,
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
  constructor(
    private readonly sessions: ExamSessionsService,
    private readonly registrations: ExamSessionRegistrationsService,
  ) {}

  @Get('templates')
  listTemplates(): Promise<ExamSessionTemplateOption[]> {
    return this.sessions.listTemplates();
  }

  @Get('candidates')
  candidates(
    @Query('restaurantId') restaurantId?: string,
    @Query('jobRole') jobRole?: string,
    @Query('q') q?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<ExamCandidateView[]> {
    return this.registrations.candidates({
      restaurantId: toPositiveInt(restaurantId),
      jobRole: jobRole?.trim() || undefined,
      q,
      sessionId: toPositiveInt(sessionId),
    });
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

  @Get(':id/registrations')
  listRegistrations(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ExamRegistrationView[]> {
    return this.registrations.list(request.user!, id);
  }

  @Post(':id/registrations')
  addRegistrations(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddExamRegistrationsDto,
  ): Promise<{ added: number }> {
    return this.registrations.add(request.user!, id, dto.userIds);
  }

  @Delete(':id/registrations/:userId')
  async removeRegistration(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    await this.registrations.remove(request.user!, id, userId);
  }
}

function toPositiveInt(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

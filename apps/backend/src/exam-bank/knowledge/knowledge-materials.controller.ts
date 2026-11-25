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
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import type { AuthenticatedRequest } from '../../auth/authenticated-request';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { EXAM_PERMISSIONS, RequirePermissions } from '../../auth/permissions';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import type {
  KnowledgeChunkView,
  KnowledgeMaterialView,
  Paginated,
} from '../exam-bank.types';
import {
  CreateKnowledgeMaterialDto,
  UpdateKnowledgeMaterialDto,
} from './dto/create-knowledge-material.dto';
import { KnowledgeMaterialsService } from './knowledge-materials.service';

// Hard multer cap; the configurable EXAM_KB_MAX_UPLOAD_MB is enforced in the service.
const UPLOAD_HARD_LIMIT_BYTES = 100 * 1024 * 1024;

@Controller('exam-bank/knowledge-materials')
@UseGuards(PermissionGuard)
@RequirePermissions(EXAM_PERMISSIONS.manageBank)
export class KnowledgeMaterialsController {
  constructor(private readonly materials: KnowledgeMaterialsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: UPLOAD_HARD_LIMIT_BYTES },
    }),
  )
  create(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateKnowledgeMaterialDto,
  ): Promise<KnowledgeMaterialView> {
    return this.materials.create(file, dto, request.user!.id);
  }

  @Get()
  list(): Promise<KnowledgeMaterialView[]> {
    return this.materials.list();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number): Promise<KnowledgeMaterialView> {
    return this.materials.get(id);
  }

  /** Title, description, category and bank targets per difficulty. */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKnowledgeMaterialDto,
  ): Promise<KnowledgeMaterialView> {
    return this.materials.update(id, dto);
  }

  @Get(':id/chunks')
  listChunks(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<KnowledgeChunkView>> {
    return this.materials.listChunks(id, query);
  }

  @Post(':id/reprocess')
  reprocess(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<KnowledgeMaterialView> {
    return this.materials.reprocess(id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.materials.remove(id);
  }
}

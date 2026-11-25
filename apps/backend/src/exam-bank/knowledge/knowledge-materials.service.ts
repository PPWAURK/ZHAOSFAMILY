import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { MediaService } from '../../media/media.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamBankConfigService } from '../config/exam-bank-config.service';
import {
  resolvePage,
  type PaginationQueryDto,
} from '../dto/pagination-query.dto';
import {
  ACTIVE_JOB_STATUSES,
  KNOWLEDGE_FOLDER,
  KNOWLEDGE_MIME_TYPES,
} from '../exam-bank.constants';
import type {
  KnowledgeChunkView,
  KnowledgeMaterialView,
  Paginated,
} from '../exam-bank.types';
import type {
  CreateKnowledgeMaterialDto,
  UpdateKnowledgeMaterialDto,
} from './dto/create-knowledge-material.dto';
import { toKnowledgeMaterialView } from './knowledge-material.mapper';

const EXTENSION_MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

/** Browsers sometimes send docx/txt as octet-stream: fall back to the extension. */
export function resolveKnowledgeMimeType(file: {
  mimetype: string;
  originalname: string;
}): string | null {
  if (KNOWLEDGE_MIME_TYPES[file.mimetype]) {
    return file.mimetype;
  }
  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME_TYPES[extension] ?? null;
}

const MAX_TITLE_LENGTH = 200;

/** "红线与黑线制度.docx" → "红线与黑线制度". */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, '').trim();
  return (base || fileName).slice(0, MAX_TITLE_LENGTH);
}

@Injectable()
export class KnowledgeMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly config: ExamBankConfigService,
  ) {}

  async create(
    file: Express.Multer.File | undefined,
    dto: CreateKnowledgeMaterialDto,
    userId: number,
  ): Promise<KnowledgeMaterialView> {
    if (!file) {
      throw new BadRequestException('KB_FILE_REQUIRED');
    }
    const mimeType = resolveKnowledgeMimeType(file);
    if (!mimeType) {
      throw new BadRequestException('KB_FILE_TYPE_NOT_ALLOWED');
    }
    if (file.size > this.config.maxUploadBytes) {
      throw new PayloadTooLargeException('KB_FILE_TOO_LARGE');
    }
    const uploaded = await this.mediaService.upload(
      { ...file, mimetype: mimeType },
      { folder: KNOWLEDGE_FOLDER },
    );
    const row = await this.prisma.examKnowledgeMaterial.create({
      data: {
        title: dto.title?.trim() || titleFromFileName(uploaded.originalName),
        description: dto.description?.trim() || null,
        bucket: uploaded.bucket,
        objectKey: uploaded.objectKey,
        originalName: uploaded.originalName,
        mimeType,
        sizeBytes: file.size,
        categoryId: await this.checkedCategoryId(dto.categoryId),
        uploadedByUserId: userId,
      },
    });
    return toKnowledgeMaterialView(row);
  }

  async list(): Promise<KnowledgeMaterialView[]> {
    const rows = await this.prisma.examKnowledgeMaterial.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toKnowledgeMaterialView);
  }

  async get(id: number): Promise<KnowledgeMaterialView> {
    return toKnowledgeMaterialView(await this.findOrThrow(id));
  }

  async update(
    id: number,
    dto: UpdateKnowledgeMaterialDto,
  ): Promise<KnowledgeMaterialView> {
    await this.findOrThrow(id);
    const targets = dto.targets;
    const row = await this.prisma.examKnowledgeMaterial.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        categoryId:
          dto.categoryId === undefined
            ? undefined
            : await this.checkedCategoryId(dto.categoryId),
        ...(targets === undefined
          ? {}
          : {
              targetRecall: targets?.recall ?? null,
              targetUnderstand: targets?.understand ?? null,
              targetScenario: targets?.scenario ?? null,
            }),
      },
    });
    return toKnowledgeMaterialView(row);
  }

  async listChunks(
    id: number,
    query: PaginationQueryDto,
  ): Promise<Paginated<KnowledgeChunkView>> {
    await this.findOrThrow(id);
    const { page, pageSize, skip } = resolvePage(query);
    const [items, total] = await Promise.all([
      this.prisma.examKnowledgeChunk.findMany({
        where: { materialId: id },
        orderBy: { ordinal: 'asc' },
        skip,
        take: pageSize,
        select: { id: true, ordinal: true, content: true, tokenEstimate: true },
      }),
      this.prisma.examKnowledgeChunk.count({ where: { materialId: id } }),
    ]);
    return { items, total, page, pageSize };
  }

  async reprocess(id: number): Promise<KnowledgeMaterialView> {
    const material = await this.findOrThrow(id);
    const isStuck =
      material.status === 'PROCESSING' &&
      (!material.lockedUntil || material.lockedUntil < new Date());
    if (
      material.status === 'PENDING' ||
      (material.status === 'PROCESSING' && !isStuck)
    ) {
      throw new ConflictException('KB_MATERIAL_ALREADY_QUEUED');
    }
    // Re-chunking gives chunks new ids, which would orphan a running job's requests.
    await this.assertNotUsedByActiveJob(id);
    const row = await this.prisma.examKnowledgeMaterial.update({
      where: { id },
      data: { status: 'PENDING', errorCode: null },
    });
    return toKnowledgeMaterialView(row);
  }

  async remove(id: number): Promise<void> {
    const material = await this.findOrThrow(id);
    await this.assertNotUsedByActiveJob(id);
    await this.prisma.examKnowledgeMaterial.delete({ where: { id } });
    await this.mediaService
      .deleteFile(material.objectKey)
      .catch(() => undefined);
  }

  private async assertNotUsedByActiveJob(id: number): Promise<void> {
    const jobs = await this.prisma.examGenerationJob.findMany({
      where: { status: { in: [...ACTIVE_JOB_STATUSES] } },
      select: { materialIds: true },
    });
    const inUse = jobs.some(
      (job) => Array.isArray(job.materialIds) && job.materialIds.includes(id),
    );
    if (inUse) {
      throw new ConflictException('KB_MATERIAL_IN_USE');
    }
  }

  private async checkedCategoryId(
    categoryId: number | null | undefined,
  ): Promise<number | null> {
    if (categoryId === null || categoryId === undefined) return null;
    const exists = await this.prisma.examCategory.count({
      where: { id: categoryId },
    });
    if (!exists) throw new BadRequestException('EXAM_CATEGORY_INVALID');
    return categoryId;
  }

  private async findOrThrow(id: number) {
    const material = await this.prisma.examKnowledgeMaterial.findUnique({
      where: { id },
    });
    if (!material) {
      throw new NotFoundException('KB_MATERIAL_NOT_FOUND');
    }
    return material;
  }
}

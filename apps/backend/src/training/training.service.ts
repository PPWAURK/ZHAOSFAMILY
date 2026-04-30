import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '../media/media.service';
import { fixMojibakeFileName } from '../media/media-filename.utils';
import { PrismaService } from '../prisma/prisma.service';
import { TRAINING_COURSE_CATALOG } from './training-catalog';
import type { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import type { CreateTrainingPositionDto } from './dto/create-training-position.dto';
import type { ListTrainingCoursesQueryDto } from './dto/list-training-courses-query.dto';
import type { ListTrainingMaterialsQueryDto } from './dto/list-training-materials-query.dto';
import type { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import type { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import type {
  TrainingCourseItem,
  TrainingMaterialItem,
  TrainingPositionItem,
} from './training.types';

type TrainingMaterialRow = {
  id: number;
  positionId: string;
  type: string;
  isRequired: boolean;
  title: string;
  description: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: bigint;
  bucket: string;
  objectKey: string;
  createdAt: Date;
  updatedAt: Date;
};

type TrainingPositionRow = {
  code: string;
  nameZh: string;
  nameEn: string;
  nameFr: string;
  parentCode: string | null;
  isActive: boolean;
  sortOrder: number;
};

function toTrainingMaterialItem(
  row: TrainingMaterialRow,
): TrainingMaterialItem {
  return {
    id: row.id,
    positionId: row.positionId,
    type: row.type,
    isRequired: row.isRequired,
    title: row.title,
    description: row.description,
    originalName: fixMojibakeFileName(row.originalName),
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes.toString(),
    bucket: row.bucket,
    objectKey: row.objectKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPositionNode(row: TrainingPositionRow): TrainingPositionItem {
  return {
    code: row.code,
    name: {
      zh: row.nameZh,
      en: row.nameEn,
      fr: row.nameFr,
    },
    parentCode: row.parentCode,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    children: [],
  };
}

function buildPositionTree(
  rows: TrainingPositionRow[],
): TrainingPositionItem[] {
  const nodes = new Map<string, TrainingPositionItem>();

  for (const row of rows) {
    nodes.set(row.code, toPositionNode(row));
  }

  const roots: TrainingPositionItem[] = [];

  for (const node of nodes.values()) {
    if (node.parentCode && nodes.has(node.parentCode)) {
      nodes.get(node.parentCode)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  listCourses(query: ListTrainingCoursesQueryDto): TrainingCourseItem[] {
    return TRAINING_COURSE_CATALOG.filter((course) => {
      if (query.section !== undefined && course.section !== query.section) {
        return false;
      }

      if (query.status !== undefined && course.status !== query.status) {
        return false;
      }

      return true;
    });
  }

  getCourse(courseId: string): TrainingCourseItem {
    const course = TRAINING_COURSE_CATALOG.find((item) => item.id === courseId);

    if (!course) {
      throw new NotFoundException('TRAINING_COURSE_NOT_FOUND');
    }

    return course;
  }

  async listPositions(): Promise<TrainingPositionItem[]> {
    const rows = await this.prismaService.trainingPosition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return buildPositionTree(rows);
  }

  async listManagedPositions(): Promise<TrainingPositionItem[]> {
    const rows = await this.prismaService.trainingPosition.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });

    return buildPositionTree(rows);
  }

  async createPosition(
    dto: CreateTrainingPositionDto,
  ): Promise<TrainingPositionItem> {
    await this.ensurePositionCodeIsAvailable(dto.code);
    await this.ensureParentPosition(dto.parentCode);

    const row = await this.prismaService.trainingPosition.create({
      data: {
        code: dto.code,
        nameZh: dto.nameZh,
        nameEn: dto.nameEn,
        nameFr: dto.nameFr,
        parentCode: dto.parentCode,
        isActive: true,
        sortOrder: dto.sortOrder,
      },
    });

    return toPositionNode(row);
  }

  async updatePosition(
    code: string,
    dto: UpdateTrainingPositionDto,
  ): Promise<TrainingPositionItem> {
    const current = await this.getPositionRow(code);

    if (code === 'ALL' && dto.isActive === false) {
      throw new BadRequestException('TRAINING_ALL_POSITION_REQUIRED');
    }

    if (current.parentCode === null && dto.parentCode !== undefined) {
      throw new BadRequestException('TRAINING_BASE_POSITION_PARENT_LOCKED');
    }

    if (dto.parentCode !== undefined) {
      await this.ensureValidParentChange(code, dto.parentCode);
    }

    const row = await this.prismaService.trainingPosition.update({
      where: { code },
      data: {
        ...(dto.nameZh !== undefined ? { nameZh: dto.nameZh } : {}),
        ...(dto.nameEn !== undefined ? { nameEn: dto.nameEn } : {}),
        ...(dto.nameFr !== undefined ? { nameFr: dto.nameFr } : {}),
        ...(dto.parentCode !== undefined ? { parentCode: dto.parentCode } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return toPositionNode(row);
  }

  async listMaterials(
    query: ListTrainingMaterialsQueryDto,
  ): Promise<TrainingMaterialItem[]> {
    const searchText = query.q?.trim();
    const rows = await this.prismaService.trainingMaterial.findMany({
      where: {
        ...(query.positionId !== undefined
          ? { positionId: query.positionId }
          : {}),
        ...(query.type !== undefined ? { type: query.type } : {}),
        ...(searchText
          ? {
              OR: [
                { title: { contains: searchText } },
                { description: { contains: searchText } },
                { originalName: { contains: searchText } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toTrainingMaterialItem);
  }

  async getMaterial(id: number): Promise<TrainingMaterialItem> {
    const row = await this.prismaService.trainingMaterial.findUnique({
      where: { id },
    });

    if (!row) {
      throw new NotFoundException('TRAINING_MATERIAL_NOT_FOUND');
    }

    return toTrainingMaterialItem(row);
  }

  async createMaterial(
    dto: CreateTrainingMaterialDto,
  ): Promise<TrainingMaterialItem> {
    await this.ensureActiveMaterialPosition(dto.positionId);

    const row = await this.prismaService.trainingMaterial.create({
      data: {
        positionId: dto.positionId,
        type: dto.type,
        isRequired: dto.isRequired ?? false,
        title: dto.title,
        description: dto.description ?? null,
        originalName: fixMojibakeFileName(dto.originalName),
        mimeType: dto.mimeType,
        sizeBytes: BigInt(dto.sizeBytes),
        bucket: dto.bucket,
        objectKey: dto.objectKey,
      },
    });

    return toTrainingMaterialItem(row);
  }

  async updateMaterial(
    id: number,
    dto: UpdateTrainingMaterialDto,
  ): Promise<TrainingMaterialItem> {
    await this.getMaterial(id);

    if (dto.positionId !== undefined) {
      await this.ensureActiveMaterialPosition(dto.positionId);
    }

    const row = await this.prismaService.trainingMaterial.update({
      where: { id },
      data: {
        ...(dto.positionId !== undefined ? { positionId: dto.positionId } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description || null }
          : {}),
      },
    });

    return toTrainingMaterialItem(row);
  }

  async deleteMaterial(
    id: number,
  ): Promise<{ message: 'TRAINING_MATERIAL_DELETED' }> {
    const material = await this.getMaterial(id);

    await this.mediaService.deleteFile(material.objectKey);
    await this.prismaService.trainingMaterial.delete({
      where: { id },
    });

    return { message: 'TRAINING_MATERIAL_DELETED' };
  }

  private async ensurePositionCodeIsAvailable(code: string): Promise<void> {
    const existing = await this.prismaService.trainingPosition.findUnique({
      where: { code },
      select: { code: true },
    });

    if (existing) {
      throw new ConflictException('TRAINING_POSITION_CODE_EXISTS');
    }
  }

  private async ensureParentPosition(parentCode: string): Promise<void> {
    const parent = await this.prismaService.trainingPosition.findUnique({
      where: { code: parentCode },
    });

    if (!parent || !parent.isActive || parent.parentCode !== null) {
      throw new BadRequestException('INVALID_TRAINING_POSITION_PARENT');
    }
  }

  private async ensureValidParentChange(
    code: string,
    parentCode: string,
  ): Promise<void> {
    if (code === parentCode) {
      throw new BadRequestException('INVALID_TRAINING_POSITION_PARENT');
    }

    await this.ensureParentPosition(parentCode);

    const descendants = await this.getDescendantCodes(code);
    if (descendants.has(parentCode)) {
      throw new BadRequestException('INVALID_TRAINING_POSITION_PARENT');
    }
  }

  private async getDescendantCodes(code: string): Promise<Set<string>> {
    const rows = await this.prismaService.trainingPosition.findMany({
      select: { code: true, parentCode: true },
    });
    const descendants = new Set<string>();
    const queue = [code];

    while (queue.length > 0) {
      const parentCode = queue.shift();
      const children = rows.filter((row) => row.parentCode === parentCode);

      for (const child of children) {
        descendants.add(child.code);
        queue.push(child.code);
      }
    }

    return descendants;
  }

  private async ensureActiveMaterialPosition(code: string): Promise<void> {
    const position = await this.prismaService.trainingPosition.findUnique({
      where: { code },
      select: { isActive: true },
    });

    if (!position || !position.isActive) {
      throw new BadRequestException('INVALID_TRAINING_POSITION');
    }
  }

  private async getPositionRow(code: string): Promise<TrainingPositionRow> {
    const row = await this.prismaService.trainingPosition.findUnique({
      where: { code },
    });

    if (!row) {
      throw new NotFoundException('TRAINING_POSITION_NOT_FOUND');
    }

    return row;
  }
}

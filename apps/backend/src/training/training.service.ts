import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from '../media/media.service';
import { fixMojibakeFileName } from '../media/media-filename.utils';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_ROLE_VALUES } from '../auth/job-roles';
import { TRAINING_COURSE_CATALOG } from './training-catalog';
import { TrainingTitleService } from './training-title.service';
import type { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import type { CreateTrainingPositionDto } from './dto/create-training-position.dto';
import type { ListTrainingCoursesQueryDto } from './dto/list-training-courses-query.dto';
import type { ListTrainingMaterialsQueryDto } from './dto/list-training-materials-query.dto';
import type { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import type { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import type { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';
import type {
  TrainingDiagnostics,
  TrainingCourseItem,
  TrainingMaterialItem,
  TrainingMaterialProgressItem,
  TrainingMyPlan,
  TrainingPlanMaterialItem,
  TrainingPositionItem,
  TrainingResolvePreview,
  TrainingStoreProgress,
} from './training.types';
import {
  ALL_POSITION_CODE,
  getRoleValues,
  resolveTrainingPositionCodes,
} from './training-position-resolver';
import type { TrainingJobRolePositionRow } from './training-position-resolver';

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

type TrainingMaterialProgressRow = {
  materialId: number;
  status: string;
  progressPct: number;
  lastOpenedAt: Date;
  completedAt: Date | null;
};

type StoreTrainingProgressRow = TrainingMaterialProgressRow & {
  userId: number;
};

type TrainingUserScope = {
  id: number;
  jobRole: string | null;
};

type TrainingStoreViewer = TrainingUserScope & {
  restaurantId: number;
  store: {
    id: number;
    name: string;
  };
  permissions: string[];
};

type TrainingStoreUserRow = {
  id: number;
  name: string;
  email: string;
  jobRole: string | null;
};

const HOLDING_JOB_ROLE = 'holding';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';
const SYSTEM_POSITION_CODES = new Set([
  ALL_POSITION_CODE,
  'FOH',
  'BOH',
  'SM',
  'RM',
  'HOLDING',
  'CASH',
  'FOH_SERVER',
  'FRONT_HOST',
  'FRONT_CASHIER',
  'FRONT_SERVER',
  'FRONT_PACKER',
  'FRONT_BAR',
  'BACK_DISHWASHER',
  'BACK_NOODLE',
  'BACK_HOT_APPETIZER',
  'BACK_COLD_APPETIZER',
  'BACK_RICE',
]);

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

function toProgressItem(
  row: TrainingMaterialProgressRow,
): TrainingMaterialProgressItem {
  const status =
    row.status === 'completed' || row.status === 'in_progress'
      ? row.status
      : 'not_started';

  return {
    materialId: row.materialId,
    status,
    progressPct: row.progressPct,
    lastOpenedAt: row.lastOpenedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
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

function hasJobRole(jobRole: string | null, expectedRole: string): boolean {
  return getRoleValues(jobRole).includes(expectedRole);
}

function isHoldingJobRole(jobRole: string | null): boolean {
  return `${jobRole || ''}`.toLowerCase() === HOLDING_JOB_ROLE;
}

function buildProgressMap(
  rows: TrainingMaterialProgressRow[],
): Map<number, TrainingMaterialProgressItem> {
  return new Map(rows.map((row) => [row.materialId, toProgressItem(row)]));
}

function getDefaultProgress(materialId: number): TrainingMaterialProgressItem {
  return {
    materialId,
    status: 'not_started',
    progressPct: 0,
    lastOpenedAt: null,
    completedAt: null,
  };
}

function toPlanMaterialItem(
  material: TrainingMaterialItem,
  progressByMaterialId: Map<number, TrainingMaterialProgressItem>,
  quizMaterialIds: Set<number>,
): TrainingPlanMaterialItem {
  return {
    ...material,
    progress:
      progressByMaterialId.get(material.id) ?? getDefaultProgress(material.id),
    hasQuiz: quizMaterialIds.has(material.id),
  };
}

function calculateCompletionPercent(total: number, completed: number): number {
  if (total === 0) {
    return 100;
  }

  return Math.round((completed / total) * 100);
}

function getLatestIsoDate(dates: (Date | null)[]): string | null {
  const latest = dates
    .filter((date): date is Date => date !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latest ? latest.toISOString() : null;
}

@Injectable()
export class TrainingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mediaService: MediaService,
    private readonly titleService: TrainingTitleService,
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

  async deletePosition(
    code: string,
  ): Promise<{ message: 'TRAINING_POSITION_DELETED' }> {
    await this.getPositionRow(code);

    if (SYSTEM_POSITION_CODES.has(code)) {
      throw new BadRequestException('TRAINING_SYSTEM_POSITION_CANNOT_DELETE');
    }

    const [childCount, materialCount, mappingCount] = await Promise.all([
      this.prismaService.trainingPosition.count({
        where: { parentCode: code },
      }),
      this.prismaService.trainingMaterial.count({
        where: { positionId: code },
      }),
      this.prismaService.trainingJobRolePosition.count({
        where: { positionCode: code },
      }),
    ]);

    if (childCount > 0) {
      throw new BadRequestException('TRAINING_POSITION_HAS_CHILDREN');
    }

    if (materialCount > 0) {
      throw new BadRequestException('TRAINING_POSITION_HAS_MATERIALS');
    }

    if (mappingCount > 0) {
      throw new BadRequestException('TRAINING_POSITION_HAS_JOB_ROLE_MAPPINGS');
    }

    await this.prismaService.trainingPosition.delete({
      where: { code },
    });

    return { message: 'TRAINING_POSITION_DELETED' };
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

  async listProgressForUser(
    userId: number,
  ): Promise<TrainingMaterialProgressItem[]> {
    const rows = await this.prismaService.trainingMaterialProgress.findMany({
      where: { userId },
      select: {
        materialId: true,
        status: true,
        progressPct: true,
        lastOpenedAt: true,
        completedAt: true,
      },
      orderBy: [{ lastOpenedAt: 'desc' }],
    });

    return rows.map(toProgressItem);
  }

  async getMyPlan(user: TrainingUserScope): Promise<TrainingMyPlan> {
    const [positions, mappings] = await Promise.all([
      this.listActivePositionRows(),
      this.listJobRolePositionRows(),
    ]);
    const { positionCodes } = resolveTrainingPositionCodes(
      user.jobRole,
      positions,
      mappings,
    );
    const materials = await this.listMaterialsForPositionCodes(positionCodes);
    const progressRows =
      await this.prismaService.trainingMaterialProgress.findMany({
        where: {
          userId: user.id,
          materialId: {
            in: materials.map((material) => material.id),
          },
        },
        select: {
          materialId: true,
          status: true,
          progressPct: true,
          lastOpenedAt: true,
          completedAt: true,
        },
      });
    const quizRows = await this.prismaService.trainingQuiz.findMany({
      where: { materialId: { in: materials.map((material) => material.id) } },
      select: { materialId: true },
    });
    const quizMaterialIds = new Set(quizRows.map((quiz) => quiz.materialId));
    const progressByMaterialId = buildProgressMap(progressRows);
    const materialItems = materials.map((material) =>
      toPlanMaterialItem(material, progressByMaterialId, quizMaterialIds),
    );
    const required = materialItems.filter((material) => material.isRequired);
    const requiredCompleted = required.filter(
      (material) => material.progress.status === 'completed',
    ).length;

    return {
      positionCodes,
      required,
      optional: materialItems.filter((material) => !material.isRequired),
      summary: {
        requiredTotal: required.length,
        requiredCompleted,
        completionPercent: calculateCompletionPercent(
          required.length,
          requiredCompleted,
        ),
      },
    };
  }

  async getStoreProgress(
    viewer: TrainingStoreViewer,
  ): Promise<TrainingStoreProgress> {
    if (!this.canViewStoreProgress(viewer)) {
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    const canViewAllStores = hasJobRole(
      viewer.jobRole,
      REGIONAL_MANAGER_JOB_ROLE,
    );
    const [positions, mappings, materials, users] = await Promise.all([
      this.listActivePositionRows(),
      this.listJobRolePositionRows(),
      this.listRequiredMaterials(),
      this.prismaService.user.findMany({
        where: canViewAllStores
          ? {
              jobRole: {
                not: HOLDING_JOB_ROLE,
              },
            }
          : { restaurantId: viewer.restaurantId },
        select: {
          id: true,
          name: true,
          email: true,
          jobRole: true,
        },
        orderBy: [{ id: 'asc' }],
      }),
    ]);
    const progressRows =
      await this.prismaService.trainingMaterialProgress.findMany({
        where: {
          userId: {
            in: users.map((user) => user.id),
          },
          materialId: {
            in: materials.map((material) => material.id),
          },
        },
        select: {
          userId: true,
          materialId: true,
          status: true,
          progressPct: true,
          lastOpenedAt: true,
          completedAt: true,
        },
      });
    const usersProgress = users.map((user) =>
      this.toStoreProgressUser(
        user,
        positions,
        mappings,
        materials,
        progressRows,
      ),
    );
    const completedEmployeeCount = usersProgress.filter(
      (user) => user.requiredTotal > 0 && user.completionPercent === 100,
    ).length;
    const totalCompletionPercent = usersProgress.reduce(
      (sum, user) => sum + user.completionPercent,
      0,
    );

    return {
      restaurant: {
        id: canViewAllStores ? 0 : viewer.store.id,
        name: canViewAllStores ? '全部门店' : viewer.store.name,
      },
      users: usersProgress,
      summary: {
        employeeCount: usersProgress.length,
        completedEmployeeCount,
        averageCompletionPercent:
          usersProgress.length === 0
            ? 100
            : Math.round(totalCompletionPercent / usersProgress.length),
      },
    };
  }

  async updateProgress(
    userId: number,
    materialId: number,
    dto: UpdateTrainingProgressDto,
  ): Promise<TrainingMaterialProgressItem> {
    await this.getMaterial(materialId);

    // A material gated by a quiz can only be completed by passing the quiz
    // (see TrainingQuizService); the viewer flow may only advance it to
    // "in_progress" so watching alone never marks it done.
    const quiz = await this.prismaService.trainingQuiz.findUnique({
      where: { materialId },
      select: { id: true },
    });
    const requestedStatus =
      quiz && dto.status === 'completed' ? 'in_progress' : dto.status;

    const progressKey = {
      userId_materialId: {
        userId,
        materialId,
      },
    };

    // Transaction ensures findUnique + upsert are atomic, preventing
    // a race condition where two concurrent creates violate the
    // unique(userId, materialId) constraint.
    const row = await this.prismaService.$transaction(async (tx) => {
      const existing = await tx.trainingMaterialProgress.findUnique({
        where: progressKey,
        select: {
          status: true,
          completedAt: true,
        },
      });

      const keepCompleted =
        existing?.status === 'completed' && requestedStatus !== 'completed';
      const cappedPct = quiz
        ? Math.min(dto.progressPct ?? 10, 99)
        : dto.progressPct;
      const progressPct = keepCompleted
        ? 100
        : requestedStatus === 'completed'
          ? 100
          : Math.max(cappedPct ?? 10, 1);
      const status = keepCompleted
        ? 'completed'
        : (requestedStatus ??
          (progressPct >= 100 ? 'completed' : 'in_progress'));
      const completedAt = status === 'completed' ? new Date() : null;
      const finalCompletedAt = keepCompleted
        ? (existing?.completedAt ?? completedAt)
        : completedAt;

      return tx.trainingMaterialProgress.upsert({
        where: progressKey,
        create: {
          userId,
          materialId,
          status,
          progressPct,
          completedAt: finalCompletedAt,
        },
        update: {
          status,
          progressPct,
          completedAt: finalCompletedAt,
          lastOpenedAt: new Date(),
        },
        select: {
          materialId: true,
          status: true,
          progressPct: true,
          lastOpenedAt: true,
          completedAt: true,
        },
      });
    });

    // Completing the last required material of a position may unlock a title.
    if (row.status === 'completed') {
      const material = await this.prismaService.trainingMaterial.findUnique({
        where: { id: materialId },
        select: { positionId: true },
      });
      if (material) {
        await this.titleService.evaluateForPosition(
          userId,
          material.positionId,
        );
      }
    }

    return toProgressItem(row);
  }

  async getDiagnostics(): Promise<TrainingDiagnostics> {
    const [positions, mappings, materials] = await Promise.all([
      this.listActivePositionRows(),
      this.listJobRolePositionRows(),
      this.prismaService.trainingMaterial.findMany({
        select: { id: true, positionId: true, isRequired: true },
      }),
    ]);
    const mappedRoles = new Set(mappings.map((mapping) => mapping.jobRole));
    const positionCodes = new Set(positions.map((position) => position.code));
    const materialPositionCodes = new Set(
      materials.map((material) => material.positionId),
    );

    return {
      unmappedJobRoles: JOB_ROLE_VALUES.filter(
        (role) => !mappedRoles.has(role),
      ),
      positionsWithoutMaterials: positions
        .filter((position) => !materialPositionCodes.has(position.code))
        .map((position) => position.code),
      orphanMaterials: [
        ...new Set(
          materials
            .filter((material) => !positionCodes.has(material.positionId))
            .map((material) => material.positionId),
        ),
      ],
      rolesResolvingToEmpty: this.getRolesResolvingToEmpty(
        positions,
        mappings,
        materials,
      ),
    };
  }

  async getResolvePreview(
    jobRole: string | null,
  ): Promise<TrainingResolvePreview> {
    const [positions, mappings] = await Promise.all([
      this.listActivePositionRows(),
      this.listJobRolePositionRows(),
    ]);
    const result = resolveTrainingPositionCodes(jobRole, positions, mappings);
    const materials = await this.listMaterialsForPositionCodes(
      result.positionCodes,
    );

    return {
      jobRole,
      positionCodes: result.positionCodes,
      requiredCount: materials.filter((material) => material.isRequired).length,
      optionalCount: materials.filter((material) => !material.isRequired)
        .length,
      warnings: result.warnings,
    };
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
      throw new BadRequestException('TRAINING_POSITION_NOT_FOUND');
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

  private async listActivePositionRows(): Promise<TrainingPositionRow[]> {
    return this.prismaService.trainingPosition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  private async listJobRolePositionRows(): Promise<
    TrainingJobRolePositionRow[]
  > {
    return this.prismaService.trainingJobRolePosition.findMany({
      select: {
        jobRole: true,
        positionCode: true,
        includeDescendants: true,
        grantsAllPositions: true,
      },
      orderBy: [{ jobRole: 'asc' }],
    });
  }

  private async listMaterialsForPositionCodes(
    positionCodes: string[],
  ): Promise<TrainingMaterialItem[]> {
    const rows = await this.prismaService.trainingMaterial.findMany({
      where: {
        positionId: {
          in: positionCodes,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toTrainingMaterialItem);
  }

  private async listRequiredMaterials(): Promise<TrainingMaterialItem[]> {
    const rows = await this.prismaService.trainingMaterial.findMany({
      where: { isRequired: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return rows.map(toTrainingMaterialItem);
  }

  private canViewStoreProgress(viewer: TrainingStoreViewer): boolean {
    if (isHoldingJobRole(viewer.jobRole)) {
      return false;
    }

    return (
      hasJobRole(viewer.jobRole, STORE_MANAGER_JOB_ROLE) ||
      hasJobRole(viewer.jobRole, REGIONAL_MANAGER_JOB_ROLE) ||
      viewer.permissions.includes('training.progress.view_store')
    );
  }

  private toStoreProgressUser(
    user: TrainingStoreUserRow,
    positions: TrainingPositionRow[],
    mappings: TrainingJobRolePositionRow[],
    materials: TrainingMaterialItem[],
    progressRows: StoreTrainingProgressRow[],
  ): TrainingStoreProgress['users'][number] {
    const { positionCodes } = resolveTrainingPositionCodes(
      user.jobRole,
      positions,
      mappings,
    );
    const requiredMaterials = materials.filter((material) =>
      positionCodes.includes(material.positionId),
    );
    const requiredMaterialIds = new Set(
      requiredMaterials.map((material) => material.id),
    );
    const relevantProgressRows = progressRows.filter(
      (progress) =>
        progress.userId === user.id &&
        requiredMaterialIds.has(progress.materialId),
    );
    const completedIds = new Set(
      relevantProgressRows
        .filter((progress) => progress.status === 'completed')
        .map((progress) => progress.materialId),
    );
    const requiredCompleted = completedIds.size;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      jobRole: user.jobRole,
      requiredTotal: requiredMaterials.length,
      requiredCompleted,
      completionPercent: calculateCompletionPercent(
        requiredMaterials.length,
        requiredCompleted,
      ),
      lastOpenedAt: getLatestIsoDate(
        relevantProgressRows.map((progress) => progress.lastOpenedAt),
      ),
    };
  }

  private getRolesResolvingToEmpty(
    positions: TrainingPositionRow[],
    mappings: TrainingJobRolePositionRow[],
    materials: { positionId: string; isRequired: boolean }[],
  ): string[] {
    return JOB_ROLE_VALUES.filter((role) => {
      const result = resolveTrainingPositionCodes(role, positions, mappings);

      return !materials.some(
        (material) =>
          material.isRequired &&
          result.positionCodes.includes(material.positionId),
      );
    });
  }
}

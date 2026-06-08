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
import { TRAINING_COURSE_CATALOG } from './training-catalog';
import type { CreateTrainingMaterialDto } from './dto/create-training-material.dto';
import type { CreateTrainingPositionDto } from './dto/create-training-position.dto';
import type { ListTrainingCoursesQueryDto } from './dto/list-training-courses-query.dto';
import type { ListTrainingMaterialsQueryDto } from './dto/list-training-materials-query.dto';
import type { UpdateTrainingMaterialDto } from './dto/update-training-material.dto';
import type { UpdateTrainingPositionDto } from './dto/update-training-position.dto';
import type { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';
import type {
  TrainingCourseItem,
  TrainingMaterialItem,
  TrainingMaterialProgressItem,
  TrainingMyPlan,
  TrainingPlanMaterialItem,
  TrainingPositionItem,
  TrainingStoreProgress,
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
const ALL_POSITION_CODE = 'ALL';
const STORE_MANAGER_JOB_ROLE = 'store-manager';
const REGIONAL_MANAGER_JOB_ROLE = 'regional-manager';
const STORE_MANAGER_POSITION_CODE = 'SM';
const JOB_ROLE_POSITION_CODE_BY_ROLE = new Map<string, string>([
  ['front-host', 'FRONT_HOST'],
  ['front-cashier', 'FRONT_CASHIER'],
  ['front-server', 'FRONT_SERVER'],
  ['front-packer', 'FRONT_PACKER'],
  ['front-bar', 'FRONT_BAR'],
  ['back-dishwasher', 'BACK_DISHWASHER'],
  ['back-noodle', 'BACK_NOODLE'],
  ['back-hot-appetizer', 'BACK_HOT_APPETIZER'],
  ['back-cold-appetizer', 'BACK_COLD_APPETIZER'],
  ['back-rice', 'BACK_RICE'],
]);
const NON_STORE_REQUIRED_POSITION_CODES = new Set([
  ALL_POSITION_CODE,
  'HOLDING',
  'RM',
]);
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

function getChildPositionCodes(
  rows: Pick<TrainingPositionRow, 'code' | 'parentCode'>[],
  parentCode: string,
): string[] {
  return rows
    .filter((row) => row.parentCode === parentCode)
    .map((row) => row.code);
}

function getRoleValues(jobRole: string | null): string[] {
  return `${jobRole || ''}`
    .split(',')
    .map((role) => role.trim())
    .filter(Boolean);
}

function getStoreRequiredPositionCodes(
  rows: Pick<TrainingPositionRow, 'code' | 'parentCode'>[],
): string[] {
  return rows
    .filter((row) => !NON_STORE_REQUIRED_POSITION_CODES.has(row.code))
    .map((row) => row.code);
}

function getAllLearningPositionCodes(
  rows: Pick<TrainingPositionRow, 'code' | 'parentCode'>[],
): string[] {
  return rows.map((row) => row.code);
}

function hasJobRole(jobRole: string | null, expectedRole: string): boolean {
  return getRoleValues(jobRole).includes(expectedRole);
}

function resolveSingleTrainingPositionCodes(
  jobRole: string,
  rows: Pick<TrainingPositionRow, 'code' | 'parentCode'>[],
): string[] {
  const roleValue = jobRole;
  const normalizedRole = roleValue.toLowerCase();
  const mappedPositionCode = JOB_ROLE_POSITION_CODE_BY_ROLE.get(normalizedRole);
  const mappedPosition = mappedPositionCode
    ? rows.find((row) => row.code === mappedPositionCode)
    : null;

  if (mappedPosition?.parentCode) {
    return [mappedPosition.code, mappedPosition.parentCode];
  }

  if (mappedPosition?.code) {
    return [mappedPosition.code];
  }

  if (
    normalizedRole.includes(HOLDING_JOB_ROLE) ||
    normalizedRole.includes('headquarter') ||
    normalizedRole.includes('hq')
  ) {
    return ['HOLDING'];
  }

  if (
    normalizedRole === REGIONAL_MANAGER_JOB_ROLE ||
    normalizedRole.includes('regional') ||
    normalizedRole.includes('rm') ||
    normalizedRole === STORE_MANAGER_JOB_ROLE ||
    normalizedRole.includes('manager') ||
    normalizedRole.includes('store') ||
    normalizedRole.includes('sm')
  ) {
    return getAllLearningPositionCodes(rows);
  }

  if (normalizedRole.includes('all-rounder')) {
    return getStoreRequiredPositionCodes(rows).filter(
      (code) => code !== STORE_MANAGER_POSITION_CODE,
    );
  }

  if (
    normalizedRole.includes('kitchen') ||
    normalizedRole.includes('boh') ||
    normalizedRole.includes('chef') ||
    normalizedRole.includes('back-of-house') ||
    normalizedRole.includes('back-assistant') ||
    normalizedRole.includes('back-dishwasher') ||
    normalizedRole.includes('back-noodle') ||
    normalizedRole.includes('back-hot-appetizer') ||
    normalizedRole.includes('back-cold-appetizer') ||
    normalizedRole.includes('back-rice')
  ) {
    return ['BOH'];
  }

  if (normalizedRole === 'cash') {
    return ['CASH'];
  }

  if (
    normalizedRole.includes('front-of-house') ||
    normalizedRole.includes('front-assistant') ||
    normalizedRole.includes('front-server') ||
    normalizedRole.includes('front-host') ||
    normalizedRole.includes('front-cashier') ||
    normalizedRole.includes('front-packer') ||
    normalizedRole.includes('front-bar')
  ) {
    return ['FOH'];
  }

  const explicitPosition = rows.find(
    (row) => row.code === roleValue.toUpperCase(),
  );

  if (explicitPosition?.parentCode) {
    return [explicitPosition.code, explicitPosition.parentCode];
  }

  if (explicitPosition?.code) {
    return [
      explicitPosition.code,
      ...getChildPositionCodes(rows, explicitPosition.code),
    ];
  }

  return [];
}

function resolveTrainingPositionCodes(
  jobRole: string | null,
  rows: Pick<TrainingPositionRow, 'code' | 'parentCode'>[],
): string[] {
  const roleValues = getRoleValues(jobRole);
  const matchedCodes = roleValues.flatMap((roleValue) =>
    resolveSingleTrainingPositionCodes(roleValue, rows),
  );
  const positionCodes = matchedCodes.length > 0 ? matchedCodes : ['FOH'];

  return [...new Set([...positionCodes, ALL_POSITION_CODE])];
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
): TrainingPlanMaterialItem {
  return {
    ...material,
    progress:
      progressByMaterialId.get(material.id) ?? getDefaultProgress(material.id),
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

    const [childCount, materialCount] = await Promise.all([
      this.prismaService.trainingPosition.count({
        where: { parentCode: code },
      }),
      this.prismaService.trainingMaterial.count({
        where: { positionId: code },
      }),
    ]);

    if (childCount > 0) {
      throw new BadRequestException('TRAINING_POSITION_HAS_CHILDREN');
    }

    if (materialCount > 0) {
      throw new BadRequestException('TRAINING_POSITION_HAS_MATERIALS');
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
    const positions = await this.listActivePositionRows();
    const positionCodes = resolveTrainingPositionCodes(user.jobRole, positions);
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
    const progressByMaterialId = buildProgressMap(progressRows);
    const materialItems = materials.map((material) =>
      toPlanMaterialItem(material, progressByMaterialId),
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
    const [positions, materials, users] = await Promise.all([
      this.listActivePositionRows(),
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
      this.toStoreProgressUser(user, positions, materials, progressRows),
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
        existing?.status === 'completed' && dto.status !== 'completed';
      const progressPct = keepCompleted
        ? 100
        : dto.status === 'completed'
          ? 100
          : Math.max(dto.progressPct ?? 10, 1);
      const status = keepCompleted
        ? 'completed'
        : (dto.status ?? (progressPct >= 100 ? 'completed' : 'in_progress'));
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

    return toProgressItem(row);
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

  private async listActivePositionRows(): Promise<TrainingPositionRow[]> {
    return this.prismaService.trainingPosition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
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
    materials: TrainingMaterialItem[],
    progressRows: StoreTrainingProgressRow[],
  ): TrainingStoreProgress['users'][number] {
    const positionCodes = resolveTrainingPositionCodes(user.jobRole, positions);
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
}

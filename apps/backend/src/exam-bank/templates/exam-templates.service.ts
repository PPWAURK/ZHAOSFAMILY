import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ExamTemplate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExamBlueprintService,
  toBlueprint,
  type BlueprintCheckView,
} from '../blueprint/exam-blueprint.service';
import {
  blueprintTimeLimit,
  blueprintTypeTotals,
  readBlueprint,
  type ExamBlueprint,
} from '../blueprint/exam-blueprint';
import type { ExamBlueprintDto } from '../blueprint/dto/exam-blueprint.dto';
import { QUESTION_TYPES } from '../exam-bank.constants';
import type {
  CreateExamTemplateDto,
  ExamPoolConfigDto,
  UpdateExamTemplateDto,
} from './dto/exam-template.dto';
import { toTemplateView, type ExamTemplateView } from './exam-template.view';
import {
  isPoolSufficient,
  poolWhere,
  templateFilters,
  type PoolCheckView,
  type TypeCounts,
} from './template-pool';

const jsonList = (list?: Array<string | number> | null) =>
  list === undefined ? undefined : list && list.length ? list : Prisma.DbNull;

function toData(
  dto: UpdateExamTemplateDto,
): Prisma.ExamTemplateUncheckedUpdateInput {
  return {
    titleZh: dto.titleZh?.trim(),
    titleFr: dto.titleFr?.trim(),
    descriptionZh:
      dto.descriptionZh === undefined
        ? undefined
        : dto.descriptionZh?.trim() || null,
    descriptionFr:
      dto.descriptionFr === undefined
        ? undefined
        : dto.descriptionFr?.trim() || null,
    singleCount: dto.singleCount,
    multipleCount: dto.multipleCount,
    booleanCount: dto.booleanCount,
    categoryIds: jsonList(dto.categoryIds),
    materialIds: jsonList(dto.materialIds),
    difficulties: jsonList(dto.difficulties),
    timeLimitMinutes: dto.timeLimitMinutes,
    passingScore: dto.passingScore,
    maxAttempts: dto.maxAttempts,
    shuffleOptions: dto.shuffleOptions,
    showExplanations: dto.showExplanations,
    isActive: dto.isActive,
    accessMode: dto.accessMode,
  };
}

/**
 * A blueprint owns the paper: counts and time limit are derived from it so
 * every list and card keeps working, and the simple-mode filters are cleared.
 */
function blueprintData(
  blueprint: ExamBlueprint,
): Prisma.ExamTemplateUncheckedUpdateInput {
  const totals = blueprintTypeTotals(blueprint);
  return {
    blueprint: blueprint,
    singleCount: totals.single,
    multipleCount: totals.multiple,
    booleanCount: totals.boolean,
    timeLimitMinutes: blueprintTimeLimit(blueprint),
    categoryIds: Prisma.DbNull,
    materialIds: Prisma.DbNull,
    difficulties: Prisma.DbNull,
  };
}

function requestedCounts(config: ExamPoolConfigDto | ExamTemplate): TypeCounts {
  return {
    single: config.singleCount ?? 0,
    multiple: config.multipleCount ?? 0,
    boolean: config.booleanCount ?? 0,
  };
}

type TemplateWithCount = ExamTemplate & { _count: { attempts: number } };

@Injectable()
export class ExamTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blueprints: ExamBlueprintService,
  ) {}

  async list(): Promise<ExamTemplateView[]> {
    const rows = await this.prisma.examTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { attempts: true } } },
    });
    return rows.map((row) => toTemplateView(row, row._count.attempts));
  }

  async create(
    dto: CreateExamTemplateDto,
    userId: number,
  ): Promise<ExamTemplateView> {
    if (!dto.titleZh?.trim() || !dto.titleFr?.trim()) {
      throw new BadRequestException('EXAM_TEMPLATE_TITLE_REQUIRED');
    }
    const blueprint = await this.parseBlueprint(dto.blueprint);
    const data = {
      ...toData(dto),
      ...(blueprint ? blueprintData(blueprint) : {}),
    };
    await this.assertUsable(data, dto.isActive ?? false);
    const row = await this.prisma.examTemplate.create({
      data: {
        ...(data as Prisma.ExamTemplateUncheckedCreateInput),
        titleZh: dto.titleZh.trim(),
        titleFr: dto.titleFr.trim(),
        createdByUserId: userId,
      },
    });
    return toTemplateView(row, 0);
  }

  async update(
    id: number,
    dto: UpdateExamTemplateDto,
  ): Promise<ExamTemplateView> {
    const existing = await this.findOrThrow(id);
    const blueprint = await this.parseBlueprint(dto.blueprint);
    // A blueprint kept from before still owns counts, time limit and filters.
    const effective =
      dto.blueprint === null
        ? null
        : (blueprint ?? readBlueprint(existing.blueprint));
    const data = {
      ...toData(dto),
      ...(effective ? blueprintData(effective) : {}),
      ...(dto.blueprint === null ? { blueprint: Prisma.DbNull } : {}),
    };
    const merged = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined),
      ),
    };
    await this.assertUsable(merged, merged.isActive);
    const row: TemplateWithCount = await this.prisma.examTemplate.update({
      where: { id },
      data,
      include: { _count: { select: { attempts: true } } },
    });
    return toTemplateView(row, row._count.attempts);
  }

  async remove(id: number): Promise<void> {
    await this.findOrThrow(id);
    if (await this.prisma.examAttempt.count({ where: { templateId: id } })) {
      throw new ConflictException('EXAM_TEMPLATE_HAS_ATTEMPTS');
    }
    await this.prisma.examTemplate.delete({ where: { id } });
  }

  async poolCheck(config: ExamPoolConfigDto): Promise<PoolCheckView> {
    const counts = await Promise.all(
      QUESTION_TYPES.map((type) =>
        this.prisma.examQuestion.count({ where: poolWhere(config, type) }),
      ),
    );
    const available = {
      single: counts[0],
      multiple: counts[1],
      boolean: counts[2],
    };
    const requested = requestedCounts(config);
    return {
      requested,
      available,
      isSufficient: isPoolSufficient(requested, available),
    };
  }

  async blueprintCheck(dto: ExamBlueprintDto): Promise<BlueprintCheckView> {
    const blueprint = (await this.parseBlueprint(dto))!;
    return this.blueprints.check(blueprint);
  }

  /** Whether a stored template (either mode) can currently be drawn. */
  async isFillable(template: ExamTemplate): Promise<boolean> {
    const blueprint = readBlueprint(template.blueprint);
    if (blueprint) return (await this.blueprints.check(blueprint)).isSufficient;
    const pool = await this.poolCheck({
      singleCount: template.singleCount,
      multipleCount: template.multipleCount,
      booleanCount: template.booleanCount,
      ...templateFilters(template),
    } as ExamPoolConfigDto);
    return pool.isSufficient;
  }

  private async parseBlueprint(
    dto: ExamBlueprintDto | null | undefined,
  ): Promise<ExamBlueprint | null> {
    if (!dto) return null;
    const blueprint = toBlueprint(dto);
    await this.blueprints.assertValid(blueprint);
    return blueprint;
  }

  /** A template needs at least one question; it can only be active when the bank can fill it. */
  private async assertUsable(
    data: Record<string, unknown>,
    isActive: boolean,
  ): Promise<void> {
    const template = data as unknown as ExamTemplate;
    const requested = requestedCounts(template);
    if (requested.single + requested.multiple + requested.boolean === 0) {
      throw new BadRequestException('EXAM_TEMPLATE_EMPTY');
    }
    if (!isActive) return;
    const blueprint = readBlueprint(template.blueprint);
    const isSufficient = blueprint
      ? (await this.blueprints.check(blueprint)).isSufficient
      : (await this.poolCheck(data)).isSufficient;
    if (!isSufficient) throw new ConflictException('EXAM_POOL_INSUFFICIENT');
  }

  private async findOrThrow(id: number): Promise<ExamTemplate> {
    const row = await this.prisma.examTemplate.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('EXAM_TEMPLATE_NOT_FOUND');
    return row;
  }
}

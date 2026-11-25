import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { QuestionDifficulty, QuestionType } from '../exam-bank.constants';
import {
  allocateTypes,
  groupByMaterial,
  sectionCells,
  type DrawCandidate,
} from './blueprint-draw';
import type { ExamBlueprintDto } from './dto/exam-blueprint.dto';
import {
  blueprintMaterialIds,
  validateBlueprint,
  type ExamBlueprint,
  type TypeCounts,
} from './exam-blueprint';

export type BlueprintCellCheck = {
  difficulty: QuestionDifficulty | null;
  required: number;
  available: number;
};

export type BlueprintCheckView = {
  isSufficient: boolean;
  sections: Array<{
    index: number;
    requiredTypes: TypeCounts;
    /** False when every file has enough questions but the type totals cannot be met. */
    isTypeMixFeasible: boolean;
    items: Array<{
      materialId: number;
      materialTitle: string | null;
      count: number;
      isSufficient: boolean;
      cells: BlueprintCellCheck[];
    }>;
  }>;
};

export type RuleLabel = {
  categoryId: number;
  labelZh: string;
  labelFr: string;
  maxWrong: number;
};

export function toBlueprint(dto: ExamBlueprintDto): ExamBlueprint {
  return {
    breakMinutes: dto.breakMinutes ?? 0,
    rules: (dto.rules ?? []).map((r) => ({
      categoryId: r.categoryId,
      maxWrong: r.maxWrong,
    })),
    sections: dto.sections.map((s) => ({
      titleZh: s.titleZh.trim(),
      titleFr: s.titleFr.trim(),
      timeLimitMinutes: s.timeLimitMinutes ?? null,
      typeCounts: {
        single: s.typeCounts.single,
        multiple: s.typeCounts.multiple,
        boolean: s.typeCounts.boolean,
      },
      items: s.items.map((i) => ({
        materialId: i.materialId,
        count: i.count,
        difficulty: i.difficulty
          ? {
              recall: i.difficulty.recall,
              understand: i.difficulty.understand,
              scenario: i.difficulty.scenario,
            }
          : null,
      })),
    })),
  };
}

/** Validation, bank coverage and candidate loading for sectioned papers. */
@Injectable()
export class ExamBlueprintService {
  constructor(private readonly prisma: PrismaService) {}

  async assertValid(blueprint: ExamBlueprint): Promise<void> {
    const error = validateBlueprint(blueprint);
    if (error) throw new BadRequestException(error);
    const materialIds = blueprintMaterialIds(blueprint);
    const materials = await this.prisma.examKnowledgeMaterial.count({
      where: { id: { in: materialIds } },
    });
    if (materials !== materialIds.length)
      throw new BadRequestException('EXAM_BLUEPRINT_MATERIAL_INVALID');
    const categoryIds = blueprint.rules.map((r) => r.categoryId);
    const categories = await this.prisma.examCategory.count({
      where: { id: { in: categoryIds } },
    });
    if (categories !== categoryIds.length)
      throw new BadRequestException('EXAM_BLUEPRINT_RULE_INVALID');
  }

  /** APPROVED questions of the blueprint's materials. */
  async loadCandidates(blueprint: ExamBlueprint): Promise<DrawCandidate[]> {
    const rows = await this.prisma.examQuestion.findMany({
      where: {
        status: 'APPROVED',
        sourceMaterialId: { in: blueprintMaterialIds(blueprint) },
      },
      select: {
        id: true,
        type: true,
        difficulty: true,
        sourceMaterialId: true,
        knowledgePoint: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type as QuestionType,
      difficulty: row.difficulty as QuestionDifficulty,
      materialId: row.sourceMaterialId!,
      knowledgePoint: row.knowledgePoint,
    }));
  }

  async check(blueprint: ExamBlueprint): Promise<BlueprintCheckView> {
    const [candidates, materials] = await Promise.all([
      this.loadCandidates(blueprint),
      this.prisma.examKnowledgeMaterial.findMany({
        where: { id: { in: blueprintMaterialIds(blueprint) } },
        select: { id: true, title: true },
      }),
    ]);
    const titles = new Map(materials.map((m) => [m.id, m.title]));
    const byMaterial = groupByMaterial(candidates);
    const sections = blueprint.sections.map((section, index) => {
      const cells = sectionCells(section, byMaterial);
      const items = section.items.map((item) => {
        const own = cells.filter((c) => c.materialId === item.materialId);
        const checks = own.map((c) => ({
          difficulty: c.difficulty,
          required: c.need,
          available: c.candidates.length,
        }));
        return {
          materialId: item.materialId,
          materialTitle: titles.get(item.materialId) ?? null,
          count: item.count,
          isSufficient: checks.every((c) => c.available >= c.required),
          cells: checks,
        };
      });
      const isTypeMixFeasible =
        items.every((i) => i.isSufficient) &&
        allocateTypes(cells, section.typeCounts) !== null;
      return {
        index,
        requiredTypes: section.typeCounts,
        isTypeMixFeasible,
        items,
      };
    });
    return {
      isSufficient: sections.every((s) => s.isTypeMixFeasible),
      sections,
    };
  }

  async ruleLabels(blueprint: ExamBlueprint): Promise<RuleLabel[]> {
    if (!blueprint.rules.length) return [];
    const categories = await this.prisma.examCategory.findMany({
      where: { id: { in: blueprint.rules.map((r) => r.categoryId) } },
      select: { id: true, nameZh: true, nameFr: true },
    });
    const byId = new Map(categories.map((c) => [c.id, c]));
    return blueprint.rules.map((rule) => ({
      ...rule,
      labelZh: byId.get(rule.categoryId)?.nameZh ?? '',
      labelFr: byId.get(rule.categoryId)?.nameFr ?? '',
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  emptyDifficultyCounts,
  type DifficultyCounts,
} from '../blueprint/exam-blueprint';
import type { QuestionDifficulty } from '../exam-bank.constants';
import type { TypeMix } from '../exam-bank.types';
import { materialTargets } from '../knowledge/knowledge-material.mapper';
import {
  planGeneration,
  type GenerationPlan,
  type PlannerChunk,
} from './generation-planner';
import {
  gapFor,
  planTargets,
  type MaterialGap,
  type TargetPlan,
} from './target-planner';

export type MaterialCoverageView = {
  materialId: number;
  title: string;
  status: string;
  categoryId: number | null;
  targets: DifficultyCounts | null;
  approved: DifficultyCounts;
  draft: DifficultyCounts;
  /** Target minus (approved + draft); what a target job would generate. */
  missing: DifficultyCounts;
};

type CountRow = {
  sourceMaterialId: number | null;
  difficulty: string;
  status: string;
  _count: { _all: number };
};

/** Loads chunk sizes and current bank coverage, then runs the pure planners. */
@Injectable()
export class GenerationPlanningService {
  constructor(private readonly prisma: PrismaService) {}

  async loadPlannerChunks(
    materialIds: readonly number[],
  ): Promise<PlannerChunk[]> {
    const chunks = await this.prisma.examKnowledgeChunk.findMany({
      where: { materialId: { in: [...materialIds] } },
      orderBy: [{ materialId: 'asc' }, { ordinal: 'asc' }],
      select: { id: true, tokenEstimate: true, materialId: true },
    });
    const counts = await this.prisma.examQuestion.groupBy({
      by: ['sourceChunkId'],
      where: {
        sourceChunkId: { in: chunks.map((c) => c.id) },
        status: { in: ['DRAFT', 'APPROVED'] },
      },
      _count: { _all: true },
    });
    const existing = new Map(
      counts.map((c) => [c.sourceChunkId, c._count._all]),
    );
    return chunks.map((c) => ({
      id: c.id,
      tokenEstimate: c.tokenEstimate,
      materialId: c.materialId,
      existingCount: existing.get(c.id) ?? 0,
    }));
  }

  async plan(
    materialIds: readonly number[],
    count: number,
    typeMix: TypeMix,
  ): Promise<GenerationPlan> {
    return planGeneration(
      await this.loadPlannerChunks(materialIds),
      count,
      typeMix,
    );
  }

  /** Every material with its targets and what the bank already holds. */
  async coverage(
    materialIds?: readonly number[],
  ): Promise<MaterialCoverageView[]> {
    const where = materialIds ? { id: { in: [...materialIds] } } : {};
    const [materials, counts] = await Promise.all([
      this.prisma.examKnowledgeMaterial.findMany({
        where,
        orderBy: [{ categoryId: 'asc' }, { title: 'asc' }],
      }),
      this.prisma.examQuestion.groupBy({
        by: ['sourceMaterialId', 'difficulty', 'status'],
        where: {
          status: { in: ['DRAFT', 'APPROVED'] },
          ...(materialIds
            ? { sourceMaterialId: { in: [...materialIds] } }
            : {}),
        },
        _count: { _all: true },
      }),
    ]);
    return materials.map((material) => {
      const approved = tally(counts, material.id, 'APPROVED');
      const draft = tally(counts, material.id, 'DRAFT');
      const targets = materialTargets(material);
      const held = addCounts(approved, draft);
      return {
        materialId: material.id,
        title: material.title,
        status: material.status,
        categoryId: material.categoryId,
        targets,
        approved,
        draft,
        missing: targets ? gapFor(targets, held) : emptyDifficultyCounts(),
      };
    });
  }

  /**
   * Plans the questions still missing for READY materials with targets.
   * `pending` (questions already queued for retry) is subtracted first.
   */
  async planTargetGaps(
    materialIds: readonly number[],
    pending: ReadonlyMap<number, DifficultyCounts> = new Map(),
  ): Promise<TargetPlan> {
    const coverage = await this.coverage(materialIds);
    const gaps: MaterialGap[] = coverage
      .filter((c) => c.status === 'READY' && c.targets)
      .map((c) => ({
        materialId: c.materialId,
        missing: gapFor(
          c.missing,
          pending.get(c.materialId) ?? emptyDifficultyCounts(),
        ),
      }));
    const chunks = await this.loadPlannerChunks(gaps.map((g) => g.materialId));
    const byMaterial = new Map<number, PlannerChunk[]>();
    for (const chunk of chunks) {
      const list = byMaterial.get(chunk.materialId!) ?? [];
      list.push(chunk);
      byMaterial.set(chunk.materialId!, list);
    }
    return planTargets(gaps, byMaterial);
  }
}

function tally(
  rows: readonly CountRow[],
  materialId: number,
  status: string,
): DifficultyCounts {
  const counts = emptyDifficultyCounts();
  for (const row of rows) {
    if (row.sourceMaterialId !== materialId || row.status !== status) continue;
    const difficulty = row.difficulty as QuestionDifficulty;
    if (difficulty in counts) counts[difficulty] += row._count._all;
  }
  return counts;
}

function addCounts(a: DifficultyCounts, b: DifficultyCounts): DifficultyCounts {
  return {
    recall: a.recall + b.recall,
    understand: a.understand + b.understand,
    scenario: a.scenario + b.scenario,
  };
}

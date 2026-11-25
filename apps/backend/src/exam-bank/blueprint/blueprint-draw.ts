import {
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionType,
} from '../exam-bank.constants';
import { shuffle, type Random } from '../attempts/exam-draw';
import type {
  BlueprintSection,
  ExamBlueprint,
  TypeCounts,
} from './exam-blueprint';

export type DrawCandidate = {
  id: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  materialId: number;
  knowledgePoint: string | null;
};

/** One quota to fill: a material, optionally restricted to one difficulty. */
export type DrawCell = {
  materialId: number;
  difficulty: QuestionDifficulty | null;
  need: number;
  candidates: DrawCandidate[];
};

export type BlueprintDraw = {
  /** Question ids per section, in draw order. */
  sections: number[][];
  /** True when no draw kept every knowledge point unique and the rule was relaxed. */
  isKnowledgePointRelaxed: boolean;
};

const DRAW_TRIES = 30;

export function normalizeKnowledgePoint(value: string | null): string | null {
  const key = value?.replace(/[\s\p{P}]/gu, '').toLowerCase();
  return key ? key : null;
}

export function groupByMaterial(
  candidates: readonly DrawCandidate[],
): Map<number, DrawCandidate[]> {
  const groups = new Map<number, DrawCandidate[]>();
  for (const candidate of candidates) {
    const list = groups.get(candidate.materialId) ?? [];
    list.push(candidate);
    groups.set(candidate.materialId, list);
  }
  return groups;
}

export function sectionCells(
  section: BlueprintSection,
  byMaterial: ReadonlyMap<number, DrawCandidate[]>,
): DrawCell[] {
  return section.items.flatMap((item): DrawCell[] => {
    const pool = byMaterial.get(item.materialId) ?? [];
    if (!item.difficulty)
      return [
        {
          materialId: item.materialId,
          difficulty: null,
          need: item.count,
          candidates: pool,
        },
      ];
    return QUESTION_DIFFICULTIES.filter((d) => item.difficulty![d] > 0).map(
      (difficulty) => ({
        materialId: item.materialId,
        difficulty,
        need: item.difficulty![difficulty],
        candidates: pool.filter((c) => c.difficulty === difficulty),
      }),
    );
  });
}

const countByType = (candidates: readonly DrawCandidate[]): TypeCounts => {
  const counts: TypeCounts = { single: 0, multiple: 0, boolean: 0 };
  for (const c of candidates) counts[c.type] += 1;
  return counts;
};

/**
 * Splits every cell's quota over the question types so that each section
 * total is met exactly, never asking a cell for more questions of a type than
 * it has. This is a bipartite max-flow (cells → types); augmenting one unit at
 * a time in random order makes the split vary between employees.
 */
export function allocateTypes(
  cells: readonly DrawCell[],
  typeCounts: TypeCounts,
  random: Random = Math.random,
): TypeCounts[] | null {
  const available = cells.map((cell) => countByType(cell.candidates));
  const flow = cells.map(
    (): TypeCounts => ({ single: 0, multiple: 0, boolean: 0 }),
  );
  const cellLeft = cells.map((cell) => cell.need);
  const typeLeft = { ...typeCounts };

  const augment = (): boolean => {
    // Search from a cell with quota left to a type with room, through
    // alternating (cell -type-> cell) re-assignments, breadth first.
    const starts = shuffle(
      cells.map((_, i) => i).filter((i) => cellLeft[i] > 0),
      random,
    );
    for (const start of starts) {
      const path = findPath(start, available, flow, typeLeft, random);
      if (!path) continue;
      applyPath(path, flow);
      cellLeft[start] -= 1;
      typeLeft[path[path.length - 1].type] -= 1;
      return true;
    }
    return false;
  };

  while (cellLeft.some((n) => n > 0)) if (!augment()) return null;
  return QUESTION_TYPES.every((t) => typeLeft[t] === 0) ? flow : null;
}

type Step = { cell: number; type: QuestionType };

/**
 * Path cell₀ →type₀ (if type₀ is full: some cell₁ gives back one type₀ slot
 * and takes type₁) … until a type with room is reached.
 */
function findPath(
  start: number,
  available: readonly TypeCounts[],
  flow: readonly TypeCounts[],
  typeLeft: Readonly<TypeCounts>,
  random: Random,
): Step[] | null {
  const queue: Array<{ cell: number; path: Step[] }> = [
    { cell: start, path: [] },
  ];
  const seenTypes = new Set<QuestionType>();
  while (queue.length) {
    const { cell, path } = queue.shift()!;
    for (const type of shuffle(QUESTION_TYPES, random)) {
      if (seenTypes.has(type)) continue;
      if (flow[cell][type] >= available[cell][type]) continue;
      seenTypes.add(type);
      const next = [...path, { cell, type }];
      if (typeLeft[type] > 0) return next;
      // Type full: free one of its slots by moving another cell off it.
      for (let other = 0; other < flow.length; other += 1)
        if (flow[other][type] > 0 && other !== cell)
          queue.push({ cell: other, path: next });
    }
  }
  return null;
}

function applyPath(path: readonly Step[], flow: TypeCounts[]): void {
  path.forEach((step, i) => {
    flow[step.cell][step.type] += 1;
    // The next step's cell gives up the slot of the type this step took.
    const next = path[i + 1];
    if (next) flow[next.cell][step.type] -= 1;
  });
}

function pickCell(
  cell: DrawCell,
  quota: TypeCounts,
  usedPoints: Set<string> | null,
  random: Random,
): number[] | null {
  const picked: number[] = [];
  for (const type of QUESTION_TYPES) {
    let left = quota[type];
    for (const candidate of shuffle(
      cell.candidates.filter((c) => c.type === type),
      random,
    )) {
      if (!left) break;
      const point = normalizeKnowledgePoint(candidate.knowledgePoint);
      if (usedPoints && point && usedPoints.has(point)) continue;
      if (usedPoints && point) usedPoints.add(point);
      picked.push(candidate.id);
      left -= 1;
    }
    if (left) return null;
  }
  return picked;
}

function drawOnce(
  blueprint: ExamBlueprint,
  byMaterial: ReadonlyMap<number, DrawCandidate[]>,
  enforcePoints: boolean,
  random: Random,
): number[][] | null {
  const usedPoints = enforcePoints ? new Set<string>() : null;
  const sections: number[][] = [];
  for (const section of blueprint.sections) {
    const cells = sectionCells(section, byMaterial);
    const quotas = allocateTypes(cells, section.typeCounts, random);
    if (!quotas) return null;
    const ids: number[] = [];
    for (const [i, cell] of cells.entries()) {
      const picked = pickCell(cell, quotas[i], usedPoints, random);
      if (!picked) return null;
      ids.push(...picked);
    }
    sections.push(shuffle(ids, random));
  }
  return sections;
}

/**
 * Draws a sectioned paper. Materials are unique across the blueprint, so the
 * sections never compete for the same question; knowledge points must be
 * unique across the whole paper. Retries with fresh randomness, and only
 * relaxes the knowledge-point rule when the bank cannot satisfy it.
 */
export function drawBlueprint(
  blueprint: ExamBlueprint,
  candidates: readonly DrawCandidate[],
  random: Random = Math.random,
): BlueprintDraw | null {
  const byMaterial = groupByMaterial(candidates);
  for (let i = 0; i < DRAW_TRIES; i += 1) {
    const sections = drawOnce(blueprint, byMaterial, true, random);
    if (sections) return { sections, isKnowledgePointRelaxed: false };
  }
  const sections = drawOnce(blueprint, byMaterial, false, random);
  return sections ? { sections, isKnowledgePointRelaxed: true } : null;
}

import {
  MAX_BLUEPRINT_ITEMS,
  MAX_BLUEPRINT_SECTIONS,
  QUESTION_DIFFICULTIES,
  QUESTION_TYPES,
  type QuestionDifficulty,
  type QuestionType,
} from '../exam-bank.constants';

export type TypeCounts = Record<QuestionType, number>;
export type DifficultyCounts = Record<QuestionDifficulty, number>;

/** Questions drawn from one knowledge material; `difficulty` fixes the split. */
export type BlueprintItem = {
  materialId: number;
  count: number;
  difficulty: DifficultyCounts | null;
};

export type BlueprintSection = {
  titleZh: string;
  titleFr: string;
  timeLimitMinutes: number | null;
  /** Exact number of each question type in this section. */
  typeCounts: TypeCounts;
  items: BlueprintItem[];
};

/** Fail the paper when more than `maxWrong` questions of the category are wrong. */
export type BlueprintRule = { categoryId: number; maxWrong: number };

export type ExamBlueprint = {
  sections: BlueprintSection[];
  breakMinutes: number;
  rules: BlueprintRule[];
};

export const sumCounts = (counts: Readonly<Record<string, number>>): number =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

export function sectionQuestionCount(section: BlueprintSection): number {
  return section.items.reduce((sum, item) => sum + item.count, 0);
}

export function blueprintTypeTotals(blueprint: ExamBlueprint): TypeCounts {
  const totals: TypeCounts = { single: 0, multiple: 0, boolean: 0 };
  for (const section of blueprint.sections)
    for (const type of QUESTION_TYPES) totals[type] += section.typeCounts[type];
  return totals;
}

/** Sum of the section limits, or null when any section is untimed. */
export function blueprintTimeLimit(blueprint: ExamBlueprint): number | null {
  const limits = blueprint.sections.map((s) => s.timeLimitMinutes);
  return limits.every((limit) => limit !== null)
    ? limits.reduce((sum: number, limit) => sum + limit, 0)
    : null;
}

export function blueprintMaterialIds(blueprint: ExamBlueprint): number[] {
  return blueprint.sections.flatMap((s) => s.items.map((i) => i.materialId));
}

function itemError(item: BlueprintItem): string | null {
  if (item.count < 1) return 'EXAM_BLUEPRINT_ITEM_COUNT_INVALID';
  if (item.difficulty && sumCounts(item.difficulty) !== item.count)
    return 'EXAM_BLUEPRINT_DIFFICULTY_MISMATCH';
  return null;
}

function sectionError(section: BlueprintSection): string | null {
  if (!section.titleZh.trim() || !section.titleFr.trim())
    return 'EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED';
  if (!section.items.length) return 'EXAM_BLUEPRINT_SECTION_EMPTY';
  for (const item of section.items) {
    const error = itemError(item);
    if (error) return error;
  }
  return sumCounts(section.typeCounts) === sectionQuestionCount(section)
    ? null
    : 'EXAM_BLUEPRINT_TYPE_MISMATCH';
}

/**
 * Structural checks a decorator cannot express. Whether the materials and
 * categories exist, and whether the bank can fill the paper, is checked by
 * the service.
 */
export function validateBlueprint(blueprint: ExamBlueprint): string | null {
  const { sections, rules } = blueprint;
  if (!sections.length || sections.length > MAX_BLUEPRINT_SECTIONS)
    return 'EXAM_BLUEPRINT_SECTION_COUNT_INVALID';
  for (const section of sections) {
    const error = sectionError(section);
    if (error) return error;
  }
  const materialIds = blueprintMaterialIds(blueprint);
  if (materialIds.length > MAX_BLUEPRINT_ITEMS)
    return 'EXAM_BLUEPRINT_TOO_MANY_ITEMS';
  if (new Set(materialIds).size !== materialIds.length)
    return 'EXAM_BLUEPRINT_DUPLICATE_MATERIAL';
  const categoryIds = rules.map((r) => r.categoryId);
  if (new Set(categoryIds).size !== categoryIds.length)
    return 'EXAM_BLUEPRINT_DUPLICATE_RULE';
  return null;
}

/** Reads the JSON column; tolerates a missing `rules`/`breakMinutes`. */
export function readBlueprint(value: unknown): ExamBlueprint | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ExamBlueprint>;
  if (!Array.isArray(raw.sections)) return null;
  return {
    sections: raw.sections,
    breakMinutes: raw.breakMinutes ?? 0,
    rules: raw.rules ?? [],
  };
}

export const emptyDifficultyCounts = (): DifficultyCounts =>
  Object.fromEntries(
    QUESTION_DIFFICULTIES.map((d) => [d, 0]),
  ) as DifficultyCounts;

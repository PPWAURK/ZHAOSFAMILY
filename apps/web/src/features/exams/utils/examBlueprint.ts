import type {
  ExamBlueprint,
  ExamBlueprintCheck,
  ExamBlueprintItem,
  ExamBlueprintRule,
  ExamBlueprintSection,
} from "@zhao/types";

import { sumCounts } from "./difficultyTargets";

/** Mirrors the backend limits (exam-bank.constants.ts). */
export const MAX_BLUEPRINT_SECTIONS = 4;
export const MAX_BLUEPRINT_ITEMS = 120;
export const MAX_BREAK_MINUTES = 120;
const DEFAULT_SECTION_MINUTES = 30;
const DEFAULT_BREAK_MINUTES = 15;

/** materialId / categoryId 0 means "not chosen yet". */
export const UNSET_ID = 0;

export function emptySection(): ExamBlueprintSection {
  return {
    titleZh: "",
    titleFr: "",
    timeLimitMinutes: DEFAULT_SECTION_MINUTES,
    typeCounts: { single: 0, multiple: 0, boolean: 0 },
    items: [],
  };
}

export function emptyItem(): ExamBlueprintItem {
  return { materialId: UNSET_ID, count: 1, difficulty: null };
}

export function defaultBlueprint(): ExamBlueprint {
  return { sections: [emptySection()], breakMinutes: DEFAULT_BREAK_MINUTES, rules: [] };
}

export function sectionItemTotal(section: ExamBlueprintSection): number {
  return section.items.reduce((sum, item) => sum + item.count, 0);
}

export function sectionTypeTotal(section: ExamBlueprintSection): number {
  return sumCounts(section.typeCounts);
}

export function isSectionTypeBalanced(section: ExamBlueprintSection): boolean {
  return sectionTypeTotal(section) === sectionItemTotal(section);
}

export function isItemSplitValid(item: ExamBlueprintItem): boolean {
  return item.difficulty === null || sumCounts(item.difficulty) === item.count;
}

export type BlueprintSummary = { questionCount: number; timeLimitMinutes: number | null };

/** Total questions, and total time (null when any section is untimed). */
export function blueprintSummary(blueprint: ExamBlueprint): BlueprintSummary {
  const limits = blueprint.sections.map((s) => s.timeLimitMinutes);
  return {
    questionCount: blueprint.sections.reduce((sum, s) => sum + sectionItemTotal(s), 0),
    timeLimitMinutes: limits.every((limit) => limit !== null)
      ? limits.reduce((sum: number, limit) => sum + (limit ?? 0), 0)
      : null,
  };
}

function itemIssue(item: ExamBlueprintItem): string | null {
  if (item.materialId === UNSET_ID) return "EXAM_BLUEPRINT_MATERIAL_INVALID";
  if (item.count < 1) return "EXAM_BLUEPRINT_ITEM_COUNT_INVALID";
  return isItemSplitValid(item) ? null : "EXAM_BLUEPRINT_DIFFICULTY_MISMATCH";
}

function sectionIssues(section: ExamBlueprintSection): string[] {
  const issues = [
    !section.titleZh.trim() || !section.titleFr.trim()
      ? "EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED"
      : null,
    section.items.length ? null : "EXAM_BLUEPRINT_SECTION_EMPTY",
    ...section.items.map(itemIssue),
    isSectionTypeBalanced(section) ? null : "EXAM_BLUEPRINT_TYPE_MISMATCH",
  ];
  return issues.filter((issue): issue is string => issue !== null);
}

const hasDuplicates = (values: readonly number[]) => new Set(values).size !== values.length;

/**
 * The same structural checks as the backend, as error codes (deduplicated),
 * so the editor can explain what is missing before saving.
 */
export function blueprintIssues(blueprint: ExamBlueprint): string[] {
  const { sections, rules, breakMinutes } = blueprint;
  const materialIds = sections.flatMap((s) => s.items.map((i) => i.materialId));
  const chosen = materialIds.filter((id) => id !== UNSET_ID);
  const categoryIds = rules.map((r) => r.categoryId);
  const issues = [
    !sections.length || sections.length > MAX_BLUEPRINT_SECTIONS
      ? "EXAM_BLUEPRINT_SECTION_COUNT_INVALID"
      : null,
    ...sections.flatMap(sectionIssues),
    materialIds.length > MAX_BLUEPRINT_ITEMS ? "EXAM_BLUEPRINT_TOO_MANY_ITEMS" : null,
    hasDuplicates(chosen) ? "EXAM_BLUEPRINT_DUPLICATE_MATERIAL" : null,
    categoryIds.includes(UNSET_ID) ? "EXAM_BLUEPRINT_RULE_INVALID" : null,
    hasDuplicates(categoryIds) ? "EXAM_BLUEPRINT_DUPLICATE_RULE" : null,
    breakMinutes < 0 || breakMinutes > MAX_BREAK_MINUTES ? "EXAM_BLUEPRINT_BREAK_INVALID" : null,
  ];
  return [...new Set(issues.filter((issue): issue is string => issue !== null))];
}

/** Materials chosen in any row except the given one (a material may be used once per paper). */
export function materialsUsedElsewhere(
  blueprint: ExamBlueprint,
  sectionIndex: number,
  itemIndex: number,
): Set<number> {
  return new Set(
    blueprint.sections.flatMap((section, s) =>
      section.items
        .filter((item, i) => !(s === sectionIndex && i === itemIndex))
        .map((item) => item.materialId)
        .filter((id) => id !== UNSET_ID),
    ),
  );
}

export type CheckableBlueprint = {
  blueprint: ExamBlueprint;
  /** Original index of each section sent (sections without a usable row are left out). */
  sectionIndexes: number[];
};

function checkableSection(section: ExamBlueprintSection, seen: Set<number>): ExamBlueprintSection {
  const items = section.items
    .filter((item) => item.materialId !== UNSET_ID && item.count >= 1)
    .filter((item) => !seen.has(item.materialId) && Boolean(seen.add(item.materialId)))
    .map((item) => ({ ...item, difficulty: isItemSplitValid(item) ? item.difficulty : null }));
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return {
    titleZh: section.titleZh.trim() || "-",
    titleFr: section.titleFr.trim() || "-",
    timeLimitMinutes:
      section.timeLimitMinutes && section.timeLimitMinutes > 0 ? section.timeLimitMinutes : null,
    // An unbalanced section is still checked for availability; its type mix is then unknown.
    typeCounts:
      sectionTypeTotal(section) === total
        ? section.typeCounts
        : { single: total, multiple: 0, boolean: 0 },
    items,
  };
}

/**
 * The part of an in-progress blueprint the server can already check: chosen
 * rows only (first use of each material), valid splits, chosen rules. Lets the
 * editor show availability per row while the form is still incomplete.
 * Returns null when no row is usable yet.
 */
export function toCheckableBlueprint(blueprint: ExamBlueprint): CheckableBlueprint | null {
  const seen = new Set<number>();
  const prepared = blueprint.sections.map((section) => checkableSection(section, seen));
  const sectionIndexes = prepared.flatMap((section, index) =>
    section.items.length ? [index] : [],
  );
  if (!sectionIndexes.length) return null;
  const categoryIds = [...new Set(blueprint.rules.map((r) => r.categoryId))];
  return {
    blueprint: {
      sections: sectionIndexes.map((index) => prepared[index]),
      breakMinutes: Math.min(MAX_BREAK_MINUTES, Math.max(0, blueprint.breakMinutes)),
      rules: categoryIds
        .filter((id) => id !== UNSET_ID)
        .map((id) => blueprint.rules.find((r) => r.categoryId === id) as ExamBlueprintRule),
    },
    sectionIndexes,
  };
}

export type SectionCheck = ExamBlueprintCheck["sections"][number];
export type ItemCheck = SectionCheck["items"][number];

/** The check result of an original section, when it was part of the request. */
export function findSectionCheck(
  check: ExamBlueprintCheck | null,
  sectionIndexes: readonly number[],
  sectionIndex: number,
): SectionCheck | null {
  const position = sectionIndexes.indexOf(sectionIndex);
  if (!check || position < 0) return null;
  return check.sections.find((s) => s.index === position) ?? check.sections[position] ?? null;
}

export function findItemCheck(
  sectionCheck: SectionCheck | null,
  materialId: number,
): ItemCheck | null {
  return sectionCheck?.items.find((item) => item.materialId === materialId) ?? null;
}

// Immutable editing helpers -------------------------------------------------

const replaceAt = <T>(list: readonly T[], index: number, value: T): T[] =>
  list.map((entry, i) => (i === index ? value : entry));

export function updateSection(
  blueprint: ExamBlueprint,
  sectionIndex: number,
  patch: Partial<ExamBlueprintSection>,
): ExamBlueprint {
  const section = blueprint.sections[sectionIndex];
  return {
    ...blueprint,
    sections: replaceAt(blueprint.sections, sectionIndex, { ...section, ...patch }),
  };
}

export function updateItem(
  blueprint: ExamBlueprint,
  sectionIndex: number,
  itemIndex: number,
  patch: Partial<ExamBlueprintItem>,
): ExamBlueprint {
  const items = blueprint.sections[sectionIndex].items;
  return updateSection(blueprint, sectionIndex, {
    items: replaceAt(items, itemIndex, { ...items[itemIndex], ...patch }),
  });
}

export function addItem(blueprint: ExamBlueprint, sectionIndex: number): ExamBlueprint {
  const items = blueprint.sections[sectionIndex].items;
  return updateSection(blueprint, sectionIndex, { items: [...items, emptyItem()] });
}

export function removeItem(
  blueprint: ExamBlueprint,
  sectionIndex: number,
  itemIndex: number,
): ExamBlueprint {
  const items = blueprint.sections[sectionIndex].items;
  return updateSection(blueprint, sectionIndex, {
    items: items.filter((_, i) => i !== itemIndex),
  });
}

export function addSection(blueprint: ExamBlueprint): ExamBlueprint {
  return { ...blueprint, sections: [...blueprint.sections, emptySection()] };
}

export function removeSection(blueprint: ExamBlueprint, sectionIndex: number): ExamBlueprint {
  return { ...blueprint, sections: blueprint.sections.filter((_, i) => i !== sectionIndex) };
}

export function updateRule(
  blueprint: ExamBlueprint,
  ruleIndex: number,
  patch: Partial<ExamBlueprintRule>,
): ExamBlueprint {
  const rule = blueprint.rules[ruleIndex];
  return { ...blueprint, rules: replaceAt(blueprint.rules, ruleIndex, { ...rule, ...patch }) };
}

export function addRule(blueprint: ExamBlueprint): ExamBlueprint {
  return { ...blueprint, rules: [...blueprint.rules, { categoryId: UNSET_ID, maxWrong: 1 }] };
}

export function removeRule(blueprint: ExamBlueprint, ruleIndex: number): ExamBlueprint {
  return { ...blueprint, rules: blueprint.rules.filter((_, i) => i !== ruleIndex) };
}

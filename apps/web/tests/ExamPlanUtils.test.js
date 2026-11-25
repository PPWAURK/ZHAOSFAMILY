import {
  DIFFICULTY_PROFILES,
  formatDifficultyCounts,
  splitByRatio,
  sumCounts,
  toCount,
} from "@/features/exams/utils/difficultyTargets";
import {
  addItem,
  addRule,
  addSection,
  blueprintIssues,
  blueprintSummary,
  defaultBlueprint,
  findItemCheck,
  findSectionCheck,
  materialsUsedElsewhere,
  removeSection,
  toCheckableBlueprint,
  updateItem,
  updateSection,
} from "@/features/exams/utils/examBlueprint";
import { failedRules, isFailedByRule } from "@/features/exams/utils/examSections";
import {
  coverageTotals,
  groupCoverageByCategory,
  hasMissingQuestions,
} from "@/features/exams/utils/materialCoverage";
import { toTemplateDraft, toTemplateInput } from "@/features/exams/utils/templateDraft";
import { categoryName } from "@/features/exams/utils/examFormat";
import { participantSectionText } from "@/features/exams/pages/ExamSessionDetailPage";
import { EXAM_SESSION_COPY } from "@/features/exams/constants/exam-session-copy";
import { buildExamQuestionsCsv } from "@/features/exams/utils/examQuestionsCsv";

jest.mock("@/shared/api/api-client", () => ({ apiClient: {} }));
jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({ useConfirm: () => jest.fn() }));
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }) => children }));

const counts = (recall, understand, scenario) => ({ recall, understand, scenario });

/** Section 0 of the 店长科目一 example: 49 questions, two rows. */
function sampleBlueprint() {
  return {
    breakMinutes: 15,
    rules: [{ categoryId: 9, maxWrong: 1 }],
    sections: [
      {
        titleZh: "上场：管理制度",
        titleFr: "Partie 1 : Gestion",
        timeLimitMinutes: 30,
        typeCounts: { single: 32, multiple: 10, boolean: 7 },
        items: [
          { materialId: 1, count: 5, difficulty: counts(2, 2, 1) },
          { materialId: 2, count: 44, difficulty: null },
        ],
      },
      {
        titleZh: "下场：门店现场",
        titleFr: "Partie 2 : Terrain",
        timeLimitMinutes: 30,
        typeCounts: { single: 33, multiple: 10, boolean: 8 },
        items: [{ materialId: 3, count: 51, difficulty: null }],
      },
    ],
  };
}

describe("difficulty targets", () => {
  test("largest remainder keeps the total and favours the biggest fractions", () => {
    expect(splitByRatio(5, DIFFICULTY_PROFILES.balanced)).toEqual(counts(2, 2, 1));
    expect(splitByRatio(10, DIFFICULTY_PROFILES.balanced)).toEqual(counts(4, 3, 3));
    expect(splitByRatio(7, DIFFICULTY_PROFILES.recallHeavy)).toEqual(counts(4, 2, 1));
    expect(splitByRatio(7, DIFFICULTY_PROFILES.scenarioHeavy)).toEqual(counts(1, 2, 4));
    expect(splitByRatio(1, DIFFICULTY_PROFILES.balanced)).toEqual(counts(1, 0, 0));
    for (const total of [1, 3, 11, 33, 101]) {
      for (const ratio of Object.values(DIFFICULTY_PROFILES)) {
        expect(sumCounts(splitByRatio(total, ratio))).toBe(total);
      }
    }
  });

  test("empty totals and inputs become zero", () => {
    expect(splitByRatio(0, DIFFICULTY_PROFILES.balanced)).toEqual(counts(0, 0, 0));
    expect(splitByRatio(5, counts(0, 0, 0))).toEqual(counts(0, 0, 0));
    expect(toCount("")).toBe(0);
    expect(toCount("-3")).toBe(0);
    expect(toCount("4.7")).toBe(4);
    expect(formatDifficultyCounts(counts(5, 3, 2))).toBe("5 / 3 / 2");
  });
});

describe("blueprint helpers", () => {
  test("the example paper is valid and sums up to 100 questions in 60 minutes", () => {
    const blueprint = sampleBlueprint();
    expect(blueprintIssues(blueprint)).toEqual([]);
    expect(blueprintSummary(blueprint)).toEqual({ questionCount: 100, timeLimitMinutes: 60 });
    const untimed = updateSection(blueprint, 1, { timeLimitMinutes: null });
    expect(blueprintSummary(untimed).timeLimitMinutes).toBeNull();
  });

  test("reports type mismatches, wrong splits, duplicates and unset rows", () => {
    let blueprint = updateSection(sampleBlueprint(), 0, {
      typeCounts: { single: 30, multiple: 10, boolean: 7 },
    });
    blueprint = updateItem(blueprint, 0, 0, { difficulty: counts(1, 1, 1) });
    blueprint = updateItem(blueprint, 1, 0, { materialId: 2 });
    blueprint = addRule(addItem(blueprint, 1));
    expect(blueprintIssues(blueprint)).toEqual([
      "EXAM_BLUEPRINT_DIFFICULTY_MISMATCH",
      "EXAM_BLUEPRINT_TYPE_MISMATCH",
      "EXAM_BLUEPRINT_MATERIAL_INVALID",
      "EXAM_BLUEPRINT_DUPLICATE_MATERIAL",
      "EXAM_BLUEPRINT_RULE_INVALID",
    ]);
  });

  test("a new blueprint asks for titles and files", () => {
    expect(blueprintIssues(defaultBlueprint())).toEqual([
      "EXAM_BLUEPRINT_SECTION_TITLE_REQUIRED",
      "EXAM_BLUEPRINT_SECTION_EMPTY",
    ]);
    const five = [1, 2, 3, 4].reduce((bp) => addSection(bp), defaultBlueprint());
    expect(blueprintIssues(five)).toContain("EXAM_BLUEPRINT_SECTION_COUNT_INVALID");
    expect(removeSection(five, 0).sections).toHaveLength(4);
  });

  test("editing helpers never mutate the original", () => {
    const original = sampleBlueprint();
    const snapshot = JSON.stringify(original);
    updateItem(original, 0, 0, { count: 9 });
    addItem(original, 1);
    addRule(original);
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  test("lists materials used in the other rows only", () => {
    const used = materialsUsedElsewhere(sampleBlueprint(), 0, 1);
    expect([...used].sort()).toEqual([1, 3]);
  });

  test("an incomplete blueprint is still checkable for availability", () => {
    let blueprint = updateSection(sampleBlueprint(), 0, {
      titleZh: "",
      typeCounts: { single: 1, multiple: 0, boolean: 0 },
    });
    blueprint = updateItem(blueprint, 0, 0, { difficulty: counts(5, 0, 1) });
    blueprint = addItem(blueprint, 0);
    blueprint = updateSection(blueprint, 1, { items: [] });
    const checkable = toCheckableBlueprint(blueprint);

    expect(checkable.sectionIndexes).toEqual([0]);
    const [section] = checkable.blueprint.sections;
    expect(section.titleZh).toBe("-");
    expect(section.items.map((i) => i.materialId)).toEqual([1, 2]);
    expect(section.items[0].difficulty).toBeNull();
    expect(section.typeCounts).toEqual({ single: 49, multiple: 0, boolean: 0 });
    expect(checkable.blueprint.rules).toEqual([{ categoryId: 9, maxWrong: 1 }]);
    expect(toCheckableBlueprint(defaultBlueprint())).toBeNull();
  });

  test("maps check results back to the edited sections and rows", () => {
    const item = { materialId: 3, materialTitle: "现场", count: 51, isSufficient: true, cells: [] };
    const check = {
      isSufficient: true,
      sections: [{ index: 0, requiredTypes: {}, isTypeMixFeasible: true, items: [item] }],
    };
    const sectionCheck = findSectionCheck(check, [1], 1);
    expect(findItemCheck(sectionCheck, 3)).toBe(item);
    expect(findSectionCheck(check, [1], 0)).toBeNull();
    expect(findItemCheck(null, 3)).toBeNull();
  });
});

describe("template input", () => {
  test("sectioned templates send the blueprint, simple ones clear it", () => {
    const draft = { ...toTemplateDraft(null), titleZh: "科目一", titleFr: "Module 1" };
    const blueprint = sampleBlueprint();
    const sectioned = toTemplateInput(draft, "sectioned", blueprint);
    expect(sectioned.blueprint).toBe(blueprint);
    expect(sectioned).not.toHaveProperty("singleCount");
    expect(sectioned).not.toHaveProperty("timeLimitMinutes");
    expect(sectioned.descriptionZh).toBeNull();

    const simple = toTemplateInput(draft, "simple", blueprint);
    expect(simple.blueprint).toBeNull();
    expect(simple).toMatchObject({ singleCount: 20, timeLimitMinutes: 30, categoryIds: [] });
  });
});

describe("coverage", () => {
  const row = (overrides) => ({
    materialId: 1,
    title: "红线",
    status: "READY",
    categoryId: null,
    targets: counts(4, 3, 3),
    approved: counts(2, 1, 0),
    draft: counts(1, 0, 0),
    missing: counts(1, 2, 3),
    ...overrides,
  });
  const category = (id, sortOrder) => ({
    id,
    code: `c${id}`,
    nameZh: `分类${id}`,
    nameFr: `Cat ${id}`,
    sortOrder,
    isActive: true,
  });

  test("groups by category order with uncategorized last and sums totals", () => {
    const rows = [
      row({ materialId: 1, categoryId: 5 }),
      row({ materialId: 2 }),
      row({ materialId: 3, categoryId: 4, targets: null, missing: counts(0, 0, 0) }),
    ];
    const groups = groupCoverageByCategory(rows, [category(5, 2), category(4, 1), category(6, 0)]);
    expect(groups.map((g) => g.category?.id ?? null)).toEqual([4, 5, null]);
    const totals = coverageTotals(rows);
    expect(totals.targets).toEqual(counts(8, 6, 6));
    expect(totals.missing).toEqual(counts(2, 4, 6));
  });

  test("only ready materials with targets and a gap can be filled", () => {
    expect(hasMissingQuestions(row())).toBe(true);
    expect(hasMissingQuestions(row({ status: "PROCESSING" }))).toBe(false);
    expect(hasMissingQuestions(row({ targets: null }))).toBe(false);
    expect(hasMissingQuestions(row({ missing: counts(0, 0, 0) }))).toBe(false);
    expect(categoryName(4, [category(4, 0)], "—")).toBe("分类4 / Cat 4");
    expect(categoryName(null, [category(4, 0)], "—")).toBe("—");
  });
});

describe("results and sessions", () => {
  const rule = (passed, wrongCount) => ({
    categoryId: 9,
    labelZh: "企业文化",
    labelFr: "Culture",
    maxWrong: 1,
    totalCount: 9,
    wrongCount,
    passed,
  });

  test("a failed veto rule explains a fail despite a passing score", () => {
    const result = { passed: false, score: 95, rules: [rule(false, 2)] };
    expect(isFailedByRule(result, 90)).toBe(true);
    expect(failedRules(result)).toHaveLength(1);
    expect(isFailedByRule({ ...result, score: 80 }, 90)).toBe(false);
    expect(isFailedByRule({ passed: true, score: 95, rules: [rule(true, 1)] }, 90)).toBe(false);
  });

  test("participant section progress shows only for running sectioned papers", () => {
    const copy = EXAM_SESSION_COPY.zh;
    const p = { status: "IN_PROGRESS", sectionIndex: 1, sectionCount: 2, isOnBreak: false };
    expect(participantSectionText(p, copy)).toBe("第 2/2 场");
    expect(participantSectionText({ ...p, isOnBreak: true }, copy)).toBe("休息中");
    expect(participantSectionText({ ...p, sectionCount: 1 }, copy)).toBeNull();
    expect(participantSectionText({ ...p, status: "SUBMITTED" }, copy)).toBeNull();
  });

  test("question CSV carries the knowledge point", () => {
    const [header, line] = buildExamQuestionsCsv([
      {
        id: 1,
        status: "APPROVED",
        type: "boolean",
        difficulty: "scenario",
        category: null,
        knowledgePoint: "洗手 20 秒",
        promptZh: "题",
        promptFr: "Q",
        options: [],
        correctKeys: ["true"],
        explanationZh: null,
        explanationFr: null,
        evidence: null,
        sourceMaterial: null,
        generationJobId: null,
        rejectReason: null,
        createdAt: "2026-11-24T10:00:00.000Z",
      },
    ])
      .replace("﻿", "")
      .trim()
      .split("\r\n");
    expect(header).toContain('"knowledge_point"');
    expect(line).toContain('"scenario"');
    expect(line).toContain('"洗手 20 秒"');
  });
});

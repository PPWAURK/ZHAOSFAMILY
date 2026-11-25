import { describeExamError } from "@/features/exams/constants/exam-errors-copy";
import { pickText, toUiLanguage } from "@/features/exams/constants/exam-languages";
import { optionsForType } from "@/features/exams/components/QuestionEditorModal";
import { isOutOfAttempts } from "@/features/exams/pages/ExamListPage";
import { countUnanswered, toAnswerList, toggleAnswer } from "@/features/exams/utils/examAnswers";
import { buildExamQuestionsCsv } from "@/features/exams/utils/examQuestionsCsv";
import { buildExamResultsCsv } from "@/features/exams/utils/examResultsCsv";
import { computeClockOffset, formatCountdown, remainingMs } from "@/features/exams/utils/examTimer";

jest.mock("@/shared/api/api-client", () => ({ apiClient: {} }));
jest.mock("@/features/dashboard/components/Sidebar", () => ({
  __esModule: true,
  default: () => null,
}));

describe("exam answers", () => {
  test("single and boolean questions replace the choice, multiple toggles keys", () => {
    let answers = toggleAnswer({}, 1, "single", "A");
    answers = toggleAnswer(answers, 1, "single", "B");
    expect(answers[1]).toEqual(["B"]);

    answers = toggleAnswer(answers, 2, "multiple", "A");
    answers = toggleAnswer(answers, 2, "multiple", "C");
    answers = toggleAnswer(answers, 2, "multiple", "A");
    expect(answers[2]).toEqual(["C"]);
  });

  test("does not mutate the previous answer map", () => {
    const before = { 1: ["A"] };
    toggleAnswer(before, 1, "multiple", "B");
    expect(before).toEqual({ 1: ["A"] });
  });

  test("drops empty answers and counts unanswered questions", () => {
    const answers = { 1: ["A"], 2: [] };
    expect(toAnswerList(answers)).toEqual([{ questionId: 1, selectedKeys: ["A"] }]);
    expect(countUnanswered([1, 2, 3], answers)).toBe(2);
  });
});

describe("exam timer", () => {
  test("uses the server clock offset and never goes negative", () => {
    const offset = computeClockOffset(
      "2026-11-18T10:00:10.000Z",
      Date.parse("2026-11-18T10:00:00.000Z"),
    );
    expect(offset).toBe(10_000);
    const deadline = "2026-11-18T10:05:00.000Z";
    expect(remainingMs(deadline, offset, Date.parse("2026-11-18T10:00:00.000Z"))).toBe(290_000);
    expect(remainingMs(deadline, offset, Date.parse("2026-11-18T11:00:00.000Z"))).toBe(0);
    expect(remainingMs(null, offset, Date.now())).toBeNull();
  });

  test("formats the countdown", () => {
    expect(formatCountdown(65_000)).toBe("01:05");
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
    expect(formatCountdown(400)).toBe("00:01");
  });
});

describe("exam helpers", () => {
  test("results CSV escapes quotes and neutralises formulas", () => {
    const csv = buildExamResultsCsv([
      {
        id: 1,
        titleZh: '卫生"考试"',
        titleFr: "Hygiène",
        user: { id: 2, name: "=HYPERLINK(1)", email: "a@b.c", jobRole: null },
        restaurant: { id: 3, name: "Paris" },
        status: "SUBMITTED",
        score: 80,
        passed: true,
        correctCount: 8,
        totalCount: 10,
        startedAt: "2026-11-18T10:00:00.000Z",
        submittedAt: "2026-11-18T10:10:00.000Z",
        durationSeconds: 600,
      },
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"卫生""考试"""');
    expect(csv).toContain('"\'=HYPERLINK(1)"');
    expect(csv).toContain('"yes"');
  });

  test("maps backend error codes to readable messages", () => {
    expect(describeExamError(new Error("EXAM_NO_ATTEMPTS_LEFT"), "zh")).toBe("答题次数已用完。");
    expect(describeExamError(new Error("EXAM_POOL_INSUFFICIENT"), "fr")).toContain("Pas assez");
    expect(describeExamError(new Error("UNKNOWN"), "en")).toBe(
      "Something went wrong. Please try again.",
    );
  });

  test("falls back between zh and fr content", () => {
    expect(toUiLanguage("de")).toBe("zh");
    expect(pickText("fr", "中文", "")).toBe("中文");
    expect(pickText("fr", "中文", "Français")).toBe("Français");
  });

  test("true/false questions get fixed options and choices keep their keys", () => {
    expect(optionsForType("boolean", []).map((o) => o.key)).toEqual(["true", "false"]);
    const choices = optionsForType("single", [{ key: "true", zh: "", fr: "" }]);
    expect(choices.map((o) => o.key)).toEqual(["A", "B", "C", "D"]);
  });

  test("an exam is blocked only when attempts are used up and none is in progress", () => {
    const exam = { inProgressAttemptId: null, maxAttempts: 2, attemptsUsed: 2 };
    expect(isOutOfAttempts(exam)).toBe(true);
    expect(isOutOfAttempts({ ...exam, inProgressAttemptId: 5 })).toBe(false);
    expect(isOutOfAttempts({ ...exam, maxAttempts: null })).toBe(false);
  });
});

describe("exam questions CSV", () => {
  const base = {
    id: 7,
    status: "DRAFT",
    type: "multiple",
    difficulty: "understand",
    knowledgePoint: "=洗手时长",
    category: {
      id: 1,
      code: "hygiene",
      nameZh: "卫生",
      nameFr: "Hygiène",
      sortOrder: 0,
      isActive: true,
    },
    promptZh: "以下哪些是正确的?",
    promptFr: "Lesquelles sont correctes ?",
    options: ["A", "B", "C", "D"].map((key) => ({ key, zh: `选项${key}`, fr: `Option ${key}` })),
    correctKeys: ["A", "C"],
    explanationZh: "解析",
    explanationFr: "Explication",
    evidence: "=SUM(1)",
    sourceMaterial: { id: 3, title: "卫生手册" },
    sourceChunkId: 11,
    generationJobId: 1,
    rejectReason: null,
    reviewedAt: null,
    createdAt: "2026-11-23T10:00:00.000Z",
    updatedAt: "2026-11-23T10:00:00.000Z",
  };

  test("writes one bilingual row per question with fixed option columns", () => {
    const [header, row] = buildExamQuestionsCsv([base]).replace("\uFEFF", "").trim().split("\r\n");
    const columns = header.split(",").map((c) => c.replaceAll('"', ""));
    expect(columns).toContain("option_5_fr");
    expect(columns.indexOf("correct_keys")).toBe(columns.indexOf("option_5_fr") + 1);
    expect(row).toContain('"以下哪些是正确的?","Lesquelles sont correctes ?"');
    expect(row).toContain('"A|C"');
    expect(row).toContain('"卫生手册"');
    expect(row).toContain('"\'=SUM(1)"');
  });

  test("leaves empty option cells for true/false questions", () => {
    const tf = {
      ...base,
      type: "boolean",
      options: [
        { key: "true", zh: "正确", fr: "Vrai" },
        { key: "false", zh: "错误", fr: "Faux" },
      ],
      correctKeys: ["true"],
      category: null,
    };
    const row = buildExamQuestionsCsv([tf]).trim().split("\r\n")[1];
    expect(row).toContain('"true","正确","Vrai","false","错误","Faux","","",""');
  });
});

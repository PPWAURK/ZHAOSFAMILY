import ReactTestRenderer from "react-test-renderer";

import AttemptResultView from "@/features/exams/components/AttemptResultView";
import { EXAM_COPY } from "@/features/exams/constants/exam-copy";
import { useExamSession } from "@/features/exams/hooks/useExamSession";
import ExamTakingPage from "@/features/exams/pages/ExamTakingPage";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("attemptId=9"),
}));
jest.mock("@/features/exams/hooks/useExamLanguage", () => ({
  useExamLanguage: () => ["zh", jest.fn()],
}));
jest.mock("@/features/exams/components/ExamShell", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));
jest.mock("@/features/exams/hooks/useExamSession", () => ({ useExamSession: jest.fn() }));

const SECTIONS = [
  {
    titleZh: "上场：管理制度",
    titleFr: "Partie 1 : Gestion",
    timeLimitMinutes: 30,
    questionCount: 2,
  },
  {
    titleZh: "下场：门店现场",
    titleFr: "Partie 2 : Terrain",
    timeLimitMinutes: 30,
    questionCount: 51,
  },
];

const question = (id) => ({
  id,
  type: "single",
  promptZh: `题目${id}`,
  promptFr: `Question ${id}`,
  options: ["A", "B"].map((key) => ({ key, zh: key, fr: key })),
});

const submit = jest.fn();
const startNextSection = jest.fn();

function mockSession({ attempt = {}, sectionBreak = {} } = {}) {
  useExamSession.mockReturnValue({
    attempt: {
      id: 9,
      titleZh: "店长科目一",
      titleFr: "Module 1",
      sections: SECTIONS,
      sectionIndex: 0,
      breakEndsAt: null,
      questions: [question(1), question(2)],
      ...attempt,
    },
    loadError: null,
    answers: { 1: ["A"] },
    remaining: 120_000,
    savedAt: null,
    isSubmitting: false,
    submitError: null,
    select: jest.fn(),
    submit,
    sectionBreak: {
      isOnBreak: false,
      breakRemaining: null,
      isStarting: false,
      error: null,
      startNextSection,
      ...sectionBreak,
    },
  });
}

async function render(element) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer;
}

const textOf = (node) => [].concat(node.props.children).join("");
const hasText = (renderer, text) =>
  renderer.root.findAll((n) => typeof n.type === "string" && textOf(n) === text).length > 0;
const button = (renderer, text) =>
  renderer.root.findAllByType("button").find((b) => textOf(b) === text);

async function click(target) {
  await ReactTestRenderer.act(async () => target.props.onClick());
}

beforeEach(() => jest.clearAllMocks());

describe("taking a sectioned paper", () => {
  test("shows the section header and warns that a section cannot be reopened", async () => {
    mockSession();
    const renderer = await render(<ExamTakingPage />);
    expect(hasText(renderer, "第 1/2 场 · 上场：管理制度")).toBe(true);

    await click(button(renderer, "提交本场"));
    expect(hasText(renderer, EXAM_COPY.zh.section.notice)).toBe(true);
    await click(button(renderer, "确认提交本场"));
    expect(submit).toHaveBeenCalledTimes(1);
  });

  test("the last section submits the paper as before", async () => {
    mockSession({ attempt: { sectionIndex: 1, questions: [question(3)] } });
    const renderer = await render(<ExamTakingPage />);
    expect(hasText(renderer, "第 2/2 场 · 下场：门店现场")).toBe(true);

    await click(button(renderer, "交卷"));
    expect(hasText(renderer, EXAM_COPY.zh.section.notice)).toBe(false);
    expect(button(renderer, "确认交卷")).toBeDefined();
  });

  test("the break screen counts down and can start the next section", async () => {
    mockSession({
      attempt: { sectionIndex: 1, breakEndsAt: "2026-11-24T10:15:00.000Z", questions: [] },
      sectionBreak: { isOnBreak: true, breakRemaining: 14 * 60_000 + 59_000 },
    });
    const renderer = await render(<ExamTakingPage />);

    expect(hasText(renderer, "场间休息")).toBe(true);
    expect(hasText(renderer, "第 1 场已提交，不能再返回修改。")).toBe(true);
    expect(hasText(renderer, "14:59")).toBe(true);
    expect(hasText(renderer, "下一场：下场：门店现场")).toBe(true);
    expect(button(renderer, "提交本场")).toBeUndefined();

    await click(button(renderer, "开始下一场"));
    expect(startNextSection).toHaveBeenCalledTimes(1);
  });

  test("once the break is over it waits for the next section instead of offering the button", async () => {
    mockSession({
      attempt: { sectionIndex: 1, breakEndsAt: "2026-11-24T10:15:00.000Z", questions: [] },
      sectionBreak: { isOnBreak: true, breakRemaining: 0 },
    });
    const renderer = await render(<ExamTakingPage />);
    expect(hasText(renderer, "正在进入下一场…")).toBe(true);
    expect(button(renderer, "开始下一场").props.disabled).toBe(true);
  });

  test("a single-section paper shows no section header", async () => {
    mockSession({ attempt: { sections: null } });
    const renderer = await render(<ExamTakingPage />);
    expect(hasText(renderer, "第 1/2 场 · 上场：管理制度")).toBe(false);
    expect(button(renderer, "交卷")).toBeDefined();
  });
});

describe("result of a sectioned paper", () => {
  const graded = (result) => ({
    id: 9,
    titleZh: "店长科目一",
    titleFr: "Module 1",
    status: "SUBMITTED",
    passingScore: 90,
    totalCount: 100,
    result: {
      score: 95,
      passed: false,
      correctCount: 95,
      showExplanations: false,
      sections: [
        { titleZh: "上场：管理制度", titleFr: "Partie 1", correctCount: 47, totalCount: 49 },
        { titleZh: "下场：门店现场", titleFr: "Partie 2", correctCount: 48, totalCount: 51 },
      ],
      rules: [
        {
          categoryId: 3,
          labelZh: "企业文化",
          labelFr: "Culture",
          maxWrong: 1,
          totalCount: 9,
          wrongCount: 2,
          passed: false,
        },
      ],
      items: [],
      ...result,
    },
  });

  test("explains that a veto rule failed the paper despite the score", async () => {
    const renderer = await render(
      <AttemptResultView attempt={graded()} lang="zh" copy={EXAM_COPY.zh} />,
    );
    expect(hasText(renderer, "企业文化 错 2 题（最多允许错 1 题），本次考试不通过。")).toBe(true);
    expect(hasText(renderer, "答对 47 / 49 题")).toBe(true);
    expect(hasText(renderer, "企业文化：答错 2 题（最多允许错 1 题）")).toBe(true);
  });

  test("a low score fails without blaming the rule", async () => {
    const renderer = await render(
      <AttemptResultView attempt={graded({ score: 80 })} lang="zh" copy={EXAM_COPY.zh} />,
    );
    expect(renderer.root.findAll((n) => n.props.role === "alert")).toHaveLength(0);
  });
});

import ReactTestRenderer from "react-test-renderer";

import ExamTakingPage from "@/features/exams/pages/ExamTakingPage";
import { useExamSession } from "@/features/exams/hooks/useExamSession";

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

const question = (id, type = "single") => ({
  id,
  type,
  promptZh: `题目${id}`,
  promptFr: `Question ${id}`,
  options: ["A", "B", "C", "D"].map((key) => ({ key, zh: key, fr: key })),
});

const submit = jest.fn();

function mockSession(answers, overrides = {}) {
  useExamSession.mockReturnValue({
    attempt: {
      id: 9,
      titleZh: "测试",
      titleFr: "Test",
      questions: [question(1), question(2), question(3)],
    },
    loadError: null,
    answers,
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
      startNextSection: jest.fn(),
    },
    ...overrides,
  });
}

async function render() {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ExamTakingPage />);
  });
  return renderer;
}

const textOf = (node) => [].concat(node.props.children).join("");
const button = (renderer, text) =>
  renderer.root.findAllByType("button").find((b) => textOf(b) === text);
const dialogs = (renderer) =>
  renderer.root.findAll((node) => node.props.role === "dialog" && typeof node.type === "string");

async function click(target) {
  await ReactTestRenderer.act(async () => {
    target.props.onClick();
  });
}

beforeEach(() => jest.clearAllMocks());

test("the last question offers review-and-submit instead of a disabled next button", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  expect(button(renderer, "下一题")).toBeDefined();

  await click(button(renderer, "3"));
  expect(button(renderer, "下一题")).toBeUndefined();
  expect(button(renderer, "检查并交卷")).toBeDefined();
});

test("shows progress and opens a review listing unanswered questions without submitting", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  expect(
    renderer.root.findAll((n) => textOf(n) === "已答 1 / 3" && typeof n.type === "string"),
  ).not.toHaveLength(0);

  await click(button(renderer, "交卷"));
  expect(dialogs(renderer)).toHaveLength(1);
  expect(submit).not.toHaveBeenCalled();

  const jumpTargets = renderer.root
    .findAllByType("button")
    .filter(
      (b) =>
        typeof b.props["aria-label"] === "string" && b.props["aria-label"].startsWith("跳到第"),
    );
  expect(jumpTargets.map(textOf)).toEqual(["2", "3"]);
});

test("jumping to an unanswered question closes the review", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  await click(button(renderer, "交卷"));
  await click(
    renderer.root.findAllByType("button").find((b) => b.props["aria-label"] === "跳到第 2 题"),
  );

  expect(dialogs(renderer)).toHaveLength(0);
  const current = renderer.root
    .findAllByType("button")
    .find((b) => b.props["aria-current"] === "step");
  expect(textOf(current)).toBe("2");
});

test("submits only after confirming in the review", async () => {
  mockSession({ 1: ["A"], 2: ["B"], 3: ["C"] });
  const renderer = await render();
  await click(button(renderer, "交卷"));
  expect(
    renderer.root.findAll((n) => textOf(n) === "所有题目都已作答。交卷后不能再修改答案。"),
  ).not.toHaveLength(0);

  await click(button(renderer, "确认交卷"));
  expect(submit).toHaveBeenCalledTimes(1);
});

test("keeps the review open and shows the error when submission fails", async () => {
  mockSession({ 1: ["A"] }, { submitError: new Error("EXAM_ATTEMPT_EXPIRED") });
  const renderer = await render();
  await click(button(renderer, "交卷"));
  const errors = renderer.root.findAll(
    (n) => textOf(n) === "考试时间已到。" && typeof n.type === "string",
  );
  expect(errors).toHaveLength(1);
  expect(dialogs(renderer)).toHaveLength(1);
});

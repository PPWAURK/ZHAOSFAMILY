import ReactTestRenderer from "react-test-renderer";
import { Modal, Text } from "react-native";

import { EXAM_COPY } from "@/features/exams/examCopy";
import { isOutOfAttempts } from "@/features/exams/ExamListView";
import { ExamTakingView } from "@/features/exams/ExamTakingView";
import { useExamSession } from "@/features/exams/useExamSession";

jest.mock("@/components/ZhaoLoadingIndicator", () => ({ ZhaoLoadingIndicator: () => null }));
jest.mock("@/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));
jest.mock("@/lib/useScreenName", () => ({ useScreenName: jest.fn() }));
jest.mock("@/features/exams/useExamSession", () => ({ useExamSession: jest.fn() }));
jest.mock("@/features/exams/examApi", () => ({}));

const copy = EXAM_COPY.zh;
const submit = jest.fn();
const startNextSection = jest.fn();
const sections = [
  {
    titleZh: "上场：管理制度",
    titleFr: "Partie 1 : Gestion",
    timeLimitMinutes: 30,
    questionCount: 3,
  },
  {
    titleZh: "下场：门店现场",
    titleFr: "Partie 2 : Terrain",
    timeLimitMinutes: 30,
    questionCount: 51,
  },
];
const sectionedAttempt = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  titleZh: "店长科目一",
  titleFr: "Gérant 1",
  sections,
  sectionIndex: 0,
  breakEndsAt: null,
  questions: [question(1), question(2), question(3)],
  ...overrides,
});
const question = (id: number) => ({
  id,
  type: "single",
  promptZh: `题目${id}`,
  promptFr: `Question ${id}`,
  options: ["A", "B", "C", "D"].map((key) => ({ key, zh: `选项${key}`, fr: key })),
});

function mockSession(answers: Record<number, string[]>, overrides: Record<string, unknown> = {}) {
  (useExamSession as jest.Mock).mockReturnValue({
    attempt: {
      id: 9,
      titleZh: "测试",
      titleFr: "Test",
      sections: null,
      sectionIndex: 0,
      breakEndsAt: null,
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
    reload: jest.fn(),
    isOnBreak: false,
    breakRemaining: null,
    isStartingSection: false,
    startError: null,
    syncError: null,
    startNextSection,
    ...overrides,
  });
}

async function render() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ExamTakingView
        attemptId={9}
        copy={copy}
        defaultLanguage="zh"
        onFinished={jest.fn()}
        onLeave={jest.fn()}
      />,
    );
  });
  return renderer;
}

const texts = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(""));

function pressText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  // Deepest match: the sheet backdrop is also pressable and contains every label.
  const target = renderer.root
    .findAll((node) => typeof node.props.onPress === "function")
    .filter((node) =>
      node.findAllByType(Text).some((t) => [].concat(t.props.children).join("") === text),
    )
    .at(-1);
  if (!target) throw new Error(`No pressable with text ${text}`);
  return ReactTestRenderer.act(async () => {
    target.props.onPress();
  });
}

beforeEach(() => jest.clearAllMocks());

test("shows progress and turns the last next button into review-and-submit", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  expect(texts(renderer)).toContain("已答 1/3");
  expect(texts(renderer)).toContain(copy.next);

  await pressText(renderer, "3");
  expect(texts(renderer)).not.toContain(copy.next);
  expect(texts(renderer)).toContain(copy.reviewAndSubmit);
});

test("opens the check sheet listing unanswered questions, and only submits on confirm", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);

  await pressText(renderer, copy.submit);
  expect(renderer.root.findByType(Modal).props.visible).toBe(true);
  expect(texts(renderer)).toContain(copy.review.unansweredHint);
  expect(submit).not.toHaveBeenCalled();

  await pressText(renderer, copy.review.confirm);
  expect(submit).toHaveBeenCalledTimes(1);
});

test("jumping to an unanswered question closes the sheet", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  await pressText(renderer, copy.submit);
  const sheet = renderer.root.findByType(Modal);
  const jump = sheet
    .findAll((node) => typeof node.props.onPress === "function")
    .filter((node) => node.findAllByType(Text).some((t) => t.props.children === 2))
    .at(-1);
  await ReactTestRenderer.act(async () => {
    jump?.props.onPress();
  });
  expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  expect(texts(renderer)).toContain(copy.question(2, 3) + " · " + copy.types.single);
});

test("single-section papers show no section heading nor section notice", async () => {
  mockSession({ 1: ["A"] });
  const renderer = await render();
  expect(texts(renderer).some((t) => t.startsWith("第 1/"))).toBe(false);
  await pressText(renderer, copy.submit);
  expect(texts(renderer)).not.toContain(copy.review.sectionNotice);
  expect(texts(renderer)).toContain(copy.review.confirm);
});

test("a non-last section shows its heading and warns that it cannot be reopened", async () => {
  mockSession({ 1: ["A"] }, { attempt: sectionedAttempt() });
  const renderer = await render();
  expect(texts(renderer)).toContain("第 1/2 场 · 上场：管理制度");
  expect(texts(renderer)).toContain("已答 1/3");

  await pressText(renderer, copy.submit);
  expect(texts(renderer)).toContain(copy.review.sectionNotice);
  await pressText(renderer, copy.review.confirmSection);
  expect(submit).toHaveBeenCalledTimes(1);
});

test("the last section submits like a normal paper", async () => {
  mockSession({}, { attempt: sectionedAttempt({ sectionIndex: 1 }) });
  const renderer = await render();
  expect(texts(renderer)).toContain("第 2/2 场 · 下场：门店现场");
  await pressText(renderer, copy.submit);
  expect(texts(renderer)).not.toContain(copy.review.sectionNotice);
  expect(texts(renderer)).toContain(copy.review.confirm);
});

test("the break screen counts down and can start the next section early", async () => {
  mockSession(
    { 1: ["A"] },
    {
      attempt: sectionedAttempt({
        sectionIndex: 1,
        breakEndsAt: "2026-11-23T10:15:00.000Z",
        questions: [],
      }),
      isOnBreak: true,
      breakRemaining: 14 * 60_000 + 5_000,
    },
  );
  const renderer = await render();
  expect(texts(renderer)).toContain(copy.breakView.handedIn(1));
  expect(texts(renderer)).toContain("14:05");
  expect(texts(renderer)).toContain("第 2/2 场 · 下场：门店现场");
  expect(texts(renderer)).toContain(copy.questions(51));
  expect(renderer.root.findAllByType(Modal)).toHaveLength(0);

  await pressText(renderer, copy.breakView.start);
  expect(startNextSection).toHaveBeenCalledTimes(1);
  expect(submit).not.toHaveBeenCalled();
});

test("the break screen waits for the next section once the countdown is over", async () => {
  mockSession(
    {},
    {
      attempt: sectionedAttempt({ sectionIndex: 1, breakEndsAt: "x", questions: [] }),
      isOnBreak: true,
      breakRemaining: 0,
      startError: new Error("EXAM_SECTION_INVALID"),
    },
  );
  const renderer = await render();
  expect(texts(renderer)).toContain(copy.breakView.waiting);
  expect(texts(renderer)).toContain(copy.errors.EXAM_SECTION_INVALID);
});

test("exams are blocked only when attempts are used up and none is in progress", () => {
  const exam = { inProgressAttemptId: null, maxAttempts: 2, attemptsUsed: 2 } as never;
  expect(isOutOfAttempts(exam)).toBe(true);
  expect(isOutOfAttempts({ ...(exam as object), inProgressAttemptId: 5 } as never)).toBe(false);
});

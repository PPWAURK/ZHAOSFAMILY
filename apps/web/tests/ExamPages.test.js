import ReactTestRenderer from "react-test-renderer";

import { EXAM_BANK_COPY } from "@/features/exams/constants/exam-bank-copy";
import ExamListPage from "@/features/exams/pages/ExamListPage";
import QuestionReviewPage from "@/features/exams/pages/QuestionReviewPage";
import { fetchAvailableExams, startExamAttempt } from "@/features/exams/services/examApi";
import {
  fetchExamCategories,
  fetchExamQuestions,
  reviewExamQuestions,
} from "@/features/exams/services/examQuestionsApi";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("jobId=7"),
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock("@/features/exams/hooks/useExamLanguage", () => ({
  useExamLanguage: () => ["zh", jest.fn()],
}));
jest.mock("@/features/exams/components/ExamShell", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));
jest.mock("@/features/exams/components/ExamBankLayout", () => {
  const { EXAM_BANK_COPY: copy } = jest.requireActual("@/features/exams/constants/exam-bank-copy");
  return { __esModule: true, default: ({ children }) => children({ lang: "zh", copy: copy.zh }) };
});
jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));
jest.mock("@/features/exams/services/examApi", () => ({
  fetchAvailableExams: jest.fn(),
  startExamAttempt: jest.fn(),
}));
jest.mock("@/features/exams/services/examQuestionsApi", () => ({
  createExamCategory: jest.fn(),
  createExamQuestion: jest.fn(),
  deleteExamCategory: jest.fn(),
  fetchExamCategories: jest.fn(),
  fetchExamQuestions: jest.fn(),
  reviewExamQuestions: jest.fn(),
  updateExamQuestion: jest.fn(),
}));

const exam = (overrides = {}) => ({
  templateId: 1,
  titleZh: "食品安全考试",
  titleFr: "Examen hygiène",
  descriptionZh: null,
  descriptionFr: null,
  questionCount: 30,
  timeLimitMinutes: 30,
  passingScore: 80,
  maxAttempts: 3,
  attemptsUsed: 0,
  bestScore: null,
  hasPassed: false,
  inProgressAttemptId: null,
  sectionCount: 1,
  ...overrides,
});

const question = (id) => ({
  id,
  type: "single",
  status: "DRAFT",
  origin: "AI",
  difficulty: "recall",
  knowledgePoint: null,
  category: null,
  promptZh: `题目${id}`,
  promptFr: `Question ${id}`,
  options: ["A", "B", "C", "D"].map((key) => ({ key, zh: key, fr: key })),
  correctKeys: ["A"],
  explanationZh: null,
  explanationFr: null,
  evidence: null,
  sourceMaterial: null,
  sourceChunkId: null,
  generationJobId: 7,
  rejectReason: null,
  reviewedAt: null,
  createdAt: "2026-11-18T10:00:00.000Z",
  updatedAt: "2026-11-18T10:00:00.000Z",
});

async function render(element) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
    await Promise.resolve();
  });
  return renderer;
}

const buttonWithText = (renderer, text) =>
  renderer.root
    .findAllByType("button")
    .find((button) => [].concat(button.props.children).join("") === text);

beforeEach(() => {
  jest.clearAllMocks();
});

test("exam list starts a new attempt and opens the taking page", async () => {
  fetchAvailableExams.mockResolvedValue([exam(), exam({ templateId: 2, inProgressAttemptId: 44 })]);
  startExamAttempt.mockResolvedValue({ id: 99 });
  const renderer = await render(<ExamListPage />);

  expect(buttonWithText(renderer, "继续作答")).toBeDefined();
  await ReactTestRenderer.act(async () => {
    buttonWithText(renderer, "开始考试").props.onClick();
  });

  expect(startExamAttempt).toHaveBeenCalledWith(1);
  expect(push).toHaveBeenCalledWith("/dashboard/exams/take?attemptId=99");
});

test("exam list disables exams without attempts left", async () => {
  fetchAvailableExams.mockResolvedValue([exam({ attemptsUsed: 3 })]);
  const renderer = await render(<ExamListPage />);
  expect(buttonWithText(renderer, "次数已用完").props.disabled).toBe(true);
});

test("review page filters by job and bulk approves the selected page", async () => {
  fetchExamCategories.mockResolvedValue([]);
  fetchExamQuestions.mockResolvedValue({
    items: [question(1), question(2)],
    total: 2,
    page: 1,
    pageSize: 20,
  });
  reviewExamQuestions.mockResolvedValue({ updated: 2 });
  const renderer = await render(<QuestionReviewPage />);

  expect(fetchExamQuestions).toHaveBeenCalledWith(
    expect.objectContaining({ status: "DRAFT", jobId: 7 }),
  );
  const selectPage = renderer.root
    .findAllByType("input")
    .find((input) => input.props.type === "checkbox" && input.props["aria-label"] === undefined);
  await ReactTestRenderer.act(async () => {
    selectPage.props.onChange({ target: { checked: true } });
  });
  const bulkApprove = renderer.root
    .findAllByType("button")
    .filter((button) => button.props.children === EXAM_BANK_COPY.zh.review.approve)[0];
  await ReactTestRenderer.act(async () => {
    bulkApprove.props.onClick();
  });

  expect(reviewExamQuestions).toHaveBeenCalledWith([1, 2], "approve");
});

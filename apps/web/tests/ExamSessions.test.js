import ReactTestRenderer from "react-test-renderer";

import JoinSessionPanel, {
  normalizeSessionCode,
} from "@/features/exams/components/JoinSessionPanel";
import { EXAM_COPY } from "@/features/exams/constants/exam-copy";
import ExamSessionDetailPage from "@/features/exams/pages/ExamSessionDetailPage";
import {
  closeExamSession,
  fetchExamSession,
  fetchRegistrations,
  joinExamSession,
  openExamSession,
  removeRegistration,
} from "@/features/exams/services/examSessionsApi";
import { buildExamSessionCsv, summarizeSession } from "@/features/exams/utils/examSessionCsv";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("sessionId=3"),
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children }) => children }));
jest.mock("@/features/exams/components/ExamSessionsLayout", () => {
  const { EXAM_SESSION_COPY } = jest.requireActual("@/features/exams/constants/exam-session-copy");
  return {
    __esModule: true,
    default: ({ children }) => children({ lang: "zh", copy: EXAM_SESSION_COPY.zh }),
  };
});
jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));
jest.mock("@/features/stores/services/restaurantsApi", () => ({
  fetchRestaurants: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/features/exams/services/examSessionsApi", () => ({
  closeExamSession: jest.fn(),
  fetchExamSession: jest.fn(),
  fetchRegistrations: jest.fn(),
  fetchCandidates: jest.fn().mockResolvedValue([]),
  addRegistrations: jest.fn(),
  removeRegistration: jest.fn(),
  joinExamSession: jest.fn(),
  openExamSession: jest.fn(),
}));

const participant = (overrides = {}) => ({
  attemptId: 1,
  user: { id: 2, name: "Li" },
  restaurant: { id: 3, name: "Paris" },
  status: "SUBMITTED",
  answeredCount: 10,
  totalCount: 10,
  score: 80,
  passed: true,
  startedAt: "2026-11-23T10:00:00.000Z",
  deadlineAt: null,
  submittedAt: "2026-11-23T10:20:00.000Z",
  sectionIndex: 0,
  sectionCount: 1,
  isOnBreak: false,
  ...overrides,
});

const session = (overrides = {}) => ({
  id: 3,
  code: "048213",
  label: null,
  status: "SCHEDULED",
  template: {
    id: 4,
    titleZh: "食品安全",
    titleFr: "Hygiène",
    questionCount: 10,
    timeLimitMinutes: 30,
    passingScore: 80,
    sectionCount: 1,
  },
  examiner: { id: 7, name: "Chef" },
  startsAt: null,
  endsAt: null,
  openedAt: null,
  closedAt: null,
  createdAt: "2026-11-23T09:00:00.000Z",
  requireRegistration: false,
  registeredCount: 0,
  participantCount: 0,
  submittedCount: 0,
  serverNow: "2026-11-23T10:00:00.000Z",
  participants: [],
  ...overrides,
});

const mounted = [];

async function render(element) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
    await Promise.resolve();
  });
  mounted.push(renderer);
  return renderer;
}

// The detail page polls every 10 s while a session runs: unmount to stop it.
afterEach(() => {
  ReactTestRenderer.act(() => mounted.splice(0).forEach((r) => r.unmount()));
});

const textOf = (node) => [].concat(node.props.children).join("");
const button = (renderer, text) =>
  renderer.root.findAllByType("button").find((b) => textOf(b) === text);

beforeEach(() => {
  jest.clearAllMocks();
  fetchRegistrations.mockResolvedValue([]);
});

describe("session helpers", () => {
  test("keeps only six digits of a typed code", () => {
    expect(normalizeSessionCode(" 04-82 13 9")).toBe("048213");
  });

  test("summarises participants and exports one CSV row each", () => {
    const detail = session({
      participants: [
        participant(),
        participant({ attemptId: 2, score: 60, passed: false }),
        participant({
          attemptId: 3,
          status: "IN_PROGRESS",
          score: null,
          passed: null,
          submittedAt: null,
        }),
      ],
    });
    expect(summarizeSession(detail)).toEqual({
      participants: 3,
      inProgress: 1,
      submitted: 2,
      passed: 1,
      average: 70,
    });
    const lines = buildExamSessionCsv(detail).trim().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('"048213","食品安全","Hygiène","Li","Paris","SUBMITTED"');
  });
});

describe("JoinSessionPanel", () => {
  test("joins with a complete code and hands over the attempt", async () => {
    joinExamSession.mockResolvedValue({ id: 99 });
    const onJoined = jest.fn();
    const renderer = await render(
      <JoinSessionPanel copy={EXAM_COPY.zh} lang="zh" onJoined={onJoined} />,
    );
    const input = renderer.root.findByType("input");
    await ReactTestRenderer.act(async () => input.props.onChange({ target: { value: "4821" } }));
    expect(button(renderer, "进入考试").props.disabled).toBe(true);

    await ReactTestRenderer.act(async () => input.props.onChange({ target: { value: "482139" } }));
    await ReactTestRenderer.act(async () => {
      renderer.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(joinExamSession).toHaveBeenCalledWith("482139");
    expect(onJoined).toHaveBeenCalledWith({ id: 99 });
  });

  test("explains why a code was refused", async () => {
    joinExamSession.mockRejectedValue(new Error("EXAM_SESSION_NOT_OPEN"));
    const renderer = await render(
      <JoinSessionPanel copy={EXAM_COPY.zh} lang="zh" onJoined={jest.fn()} />,
    );
    await ReactTestRenderer.act(async () =>
      renderer.root.findByType("input").props.onChange({ target: { value: "123456" } }),
    );
    await ReactTestRenderer.act(async () => {
      renderer.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() });
    });
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toBe(
      "考试还没开始，请等考官开始后再输入编号。",
    );
  });
});

describe("ExamSessionDetailPage", () => {
  test("starts a scheduled session", async () => {
    fetchExamSession.mockResolvedValue(session());
    openExamSession.mockResolvedValue(session({ status: "OPEN" }));
    const renderer = await render(<ExamSessionDetailPage />);
    expect(
      renderer.root.findAll((n) => textOf(n) === "048213" && typeof n.type === "string"),
    ).not.toHaveLength(0);

    await ReactTestRenderer.act(async () => button(renderer, "开始考试").props.onClick());
    expect(openExamSession).toHaveBeenCalledWith(3);
  });

  test("ends a running session after confirmation and shows participants", async () => {
    fetchExamSession.mockResolvedValue(session({ status: "OPEN", participants: [participant()] }));
    closeExamSession.mockResolvedValue(session({ status: "CLOSED" }));
    const renderer = await render(<ExamSessionDetailPage />);
    expect(renderer.root.findAll((n) => textOf(n) === "Li" && n.type === "td")).toHaveLength(1);
    expect(button(renderer, "开始考试")).toBeUndefined();

    await ReactTestRenderer.act(async () => button(renderer, "结束并收卷").props.onClick());
    expect(closeExamSession).toHaveBeenCalledWith(3);
  });

  test("shows the current part of a sectioned paper, or that the employee is on break", async () => {
    const running = { status: "IN_PROGRESS", score: null, passed: null, submittedAt: null };
    fetchExamSession.mockResolvedValue(
      session({
        status: "OPEN",
        participants: [
          participant({ ...running, sectionIndex: 1, sectionCount: 2 }),
          participant({
            ...running,
            attemptId: 2,
            sectionIndex: 1,
            sectionCount: 2,
            isOnBreak: true,
          }),
          participant({ ...running, attemptId: 3 }),
        ],
      }),
    );
    const renderer = await render(<ExamSessionDetailPage />);
    const texts = renderer.root.findAll((n) => n.type === "span").map(textOf);
    expect(texts).toContain("第 2/2 场");
    expect(texts).toContain("休息中");
    expect(texts.filter((t) => t.startsWith("第 "))).toHaveLength(1);
  });

  test("lists the roster and removes someone who has not joined", async () => {
    fetchExamSession.mockResolvedValue(session({ requireRegistration: true, registeredCount: 2 }));
    fetchRegistrations.mockResolvedValue([
      registration({ userId: 5, name: "Wang", status: "NOT_STARTED" }),
      registration({ userId: 6, name: "Zhou", status: "SUBMITTED" }),
    ]);
    removeRegistration.mockResolvedValue(undefined);
    const renderer = await render(<ExamSessionDetailPage />);

    const html = JSON.stringify(renderer.toJSON());
    for (const text of ["Wang", "Zhou", "未进场", "已交卷"]) expect(html).toContain(text);
    const removeButtons = renderer.root.findAllByType("button").filter((b) => textOf(b) === "移除");
    expect(removeButtons).toHaveLength(1);

    await ReactTestRenderer.act(async () => removeButtons[0].props.onClick());
    expect(removeRegistration).toHaveBeenCalledWith(3, 5);
  });
});

const registration = (overrides = {}) => ({
  userId: 5,
  name: "Wang",
  restaurant: { id: 3, name: "Paris" },
  jobRole: "store-manager",
  status: "NOT_STARTED",
  registeredAt: "2026-11-26T09:00:00.000Z",
  ...overrides,
});

describe("roster CSV", () => {
  test("adds registered users who never joined as extra rows", () => {
    const detail = session({ participants: [participant()] });
    const lines = buildExamSessionCsv(detail, [
      registration({ userId: 2, name: "Li", status: "SUBMITTED" }),
      registration({ userId: 9, name: "Absent", status: "ABSENT" }),
    ])
      .trim()
      .split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain('"Absent","Paris","ABSENT"');
  });
});

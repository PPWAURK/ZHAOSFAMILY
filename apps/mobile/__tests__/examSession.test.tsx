import ReactTestRenderer from "react-test-renderer";
import { AppState } from "react-native";

import {
  fetchExamAttempt,
  saveExamAnswers,
  startExamSection,
  submitExamAttempt,
} from "@/features/exams/examApi";
import { BREAK_RESYNC_MS } from "@/features/exams/useExamBreak";
import {
  AUTOSAVE_MS,
  SUBMIT_RETRY_MS,
  useExamSession,
  type ExamSession,
} from "@/features/exams/useExamSession";

jest.mock("@/features/exams/examApi", () => ({
  fetchExamAttempt: jest.fn(),
  saveExamAnswers: jest.fn(),
  submitExamAttempt: jest.fn(),
  startExamSection: jest.fn(),
}));

const fetchMock = fetchExamAttempt as jest.Mock;
const saveMock = saveExamAnswers as jest.Mock;
const submitMock = submitExamAttempt as jest.Mock;
const startSectionMock = startExamSection as jest.Mock;
const NOW = Date.parse("2026-11-23T10:00:00.000Z");

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 9,
    status: "IN_PROGRESS",
    titleZh: "考试",
    titleFr: "Examen",
    serverNow: new Date(NOW).toISOString(),
    deadlineAt: new Date(NOW + 5_000).toISOString(),
    answers: [{ questionId: 1, selectedKeys: ["A"] }],
    sections: null,
    sectionIndex: 0,
    breakEndsAt: null,
    questions: [
      { id: 1, type: "single", promptZh: "q1", promptFr: "q1", options: [] },
      { id: 2, type: "multiple", promptZh: "q2", promptFr: "q2", options: [] },
    ],
    ...overrides,
  };
}

let session: ExamSession;
function Harness({ onFinished }: { onFinished: (attempt: unknown) => void }) {
  session = useExamSession(9, onFinished);
  return null;
}

async function mount(onFinished = jest.fn()) {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Harness onFinished={onFinished} />);
    await Promise.resolve();
  });
  return onFinished;
}

async function advance(ms: number) {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

let appStateListener: ((state: string) => void) | null = null;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
  appStateListener = null;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appStateListener = listener as (state: string) => void;
    return { remove: jest.fn() } as never;
  });
  fetchMock.mockResolvedValue(attempt());
  saveMock.mockResolvedValue({ savedAt: "2026-11-23T10:00:30.000Z" });
  submitMock.mockResolvedValue(attempt({ status: "SUBMITTED" }));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("restores saved answers and submits automatically at time-up", async () => {
  const onFinished = await mount();
  expect(session.answers).toEqual({ 1: ["A"] });

  await ReactTestRenderer.act(async () => {
    session.select(2, "multiple", "B");
  });
  await advance(6_000);

  expect(submitMock).toHaveBeenCalledTimes(1);
  expect(submitMock).toHaveBeenCalledWith(
    9,
    [
      { questionId: 1, selectedKeys: ["A"] },
      { questionId: 2, selectedKeys: ["B"] },
    ],
    undefined,
  );
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));
});

test("autosaves changes every 30 seconds and immediately when the app goes to the background", async () => {
  fetchMock.mockResolvedValue(attempt({ deadlineAt: null }));
  await mount();
  await advance(AUTOSAVE_MS);
  expect(saveMock).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    session.select(1, "single", "B");
  });
  await ReactTestRenderer.act(async () => {
    appStateListener?.("background");
    await Promise.resolve();
  });
  expect(saveMock).toHaveBeenCalledTimes(1);
  expect(saveMock).toHaveBeenCalledWith(9, [{ questionId: 1, selectedKeys: ["B"] }]);

  await advance(AUTOSAVE_MS);
  expect(saveMock).toHaveBeenCalledTimes(1);
});

test("retries the time-up submission after a network failure", async () => {
  submitMock
    .mockRejectedValueOnce(Object.assign(new Error("Network Error"), { status: 0 }))
    .mockResolvedValueOnce(attempt({ status: "SUBMITTED" }));
  const onFinished = await mount();
  await advance(6_000);
  expect(submitMock).toHaveBeenCalledTimes(1);
  await advance(SUBMIT_RETRY_MS);
  expect(submitMock).toHaveBeenCalledTimes(2);
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));
});

test("hands a graded attempt straight to the result view", async () => {
  fetchMock.mockResolvedValue(attempt({ status: "EXPIRED" }));
  const onFinished = await mount();
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "EXPIRED" }));
  expect(session.attempt).toBeNull();
});

describe("sectioned paper", () => {
  const sections = [
    { titleZh: "上场", titleFr: "Partie 1", timeLimitMinutes: 30, questionCount: 2 },
    { titleZh: "下场", titleFr: "Partie 2", timeLimitMinutes: 30, questionCount: 1 },
  ];
  const BREAK_MS = 15 * 60_000;
  const onBreak = (overrides: Record<string, unknown> = {}) =>
    attempt({
      sections,
      sectionIndex: 1,
      breakEndsAt: new Date(NOW + BREAK_MS).toISOString(),
      deadlineAt: new Date(NOW + BREAK_MS + 30 * 60_000).toISOString(),
      questions: [],
      ...overrides,
    });
  const secondSection = (overrides: Record<string, unknown> = {}) =>
    attempt({
      sections,
      sectionIndex: 1,
      breakEndsAt: null,
      deadlineAt: new Date(NOW + BREAK_MS + 30 * 60_000).toISOString(),
      answers: [{ questionId: 1, selectedKeys: ["A"] }],
      questions: [{ id: 3, type: "single", promptZh: "q3", promptFr: "q3", options: [] }],
      ...overrides,
    });

  beforeEach(() => {
    fetchMock.mockResolvedValue(attempt({ sections }));
    submitMock.mockResolvedValue(onBreak());
  });

  test("auto-submits the section with its index and moves to the break, keeping answers", async () => {
    const onFinished = await mount();
    await ReactTestRenderer.act(async () => {
      session.select(2, "multiple", "C");
    });
    await advance(6_000);

    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith(
      9,
      [
        { questionId: 1, selectedKeys: ["A"] },
        { questionId: 2, selectedKeys: ["C"] },
      ],
      0,
    );
    expect(onFinished).not.toHaveBeenCalled();
    expect(session.isOnBreak).toBe(true);
    expect(session.breakRemaining).toBeGreaterThan(BREAK_MS - 10_000);
    expect(session.answers).toEqual({ 1: ["A"], 2: ["C"] });

    // The next section's deadline is far away: no second automatic submit.
    await advance(60_000);
    expect(submitMock).toHaveBeenCalledTimes(1);
  });

  test("refetches when the break ends until the next section's questions arrive", async () => {
    fetchMock.mockResolvedValueOnce(onBreak({ breakEndsAt: new Date(NOW + 2_000).toISOString() }));
    await mount();
    expect(session.isOnBreak).toBe(true);

    fetchMock.mockResolvedValueOnce(onBreak({ breakEndsAt: new Date(NOW).toISOString() }));
    await advance(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.isOnBreak).toBe(true);

    fetchMock.mockResolvedValueOnce(secondSection());
    await advance(BREAK_RESYNC_MS);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(session.isOnBreak).toBe(false);
    expect(session.attempt?.questions?.map((q) => q.id)).toEqual([3]);
    expect(session.answers).toEqual({ 1: ["A"] });
  });

  test("starts the next section early", async () => {
    fetchMock.mockResolvedValue(onBreak());
    startSectionMock.mockResolvedValue(secondSection());
    await mount();

    await ReactTestRenderer.act(async () => {
      await session.startNextSection();
    });
    expect(startSectionMock).toHaveBeenCalledWith(9, 1);
    expect(session.isOnBreak).toBe(false);
    expect(session.attempt?.sectionIndex).toBe(1);
  });

  test("refetches the attempt when the app comes back during the break", async () => {
    fetchMock.mockResolvedValueOnce(onBreak());
    await mount();
    fetchMock.mockResolvedValueOnce(secondSection());
    await ReactTestRenderer.act(async () => {
      appStateListener?.("active");
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.isOnBreak).toBe(false);
  });

  test("a stale submit refused on the break resyncs instead of showing an error", async () => {
    submitMock.mockRejectedValue(
      Object.assign(new Error("EXAM_SECTION_ON_BREAK"), { status: 409 }),
    );
    await mount();
    fetchMock.mockResolvedValueOnce(onBreak());
    await ReactTestRenderer.act(async () => {
      await session.submit();
    });
    expect(session.submitError).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(session.isOnBreak).toBe(true);
  });

  test("handing in the last section shows the result", async () => {
    fetchMock.mockResolvedValue(secondSection());
    submitMock.mockResolvedValue(secondSection({ status: "SUBMITTED" }));
    const onFinished = await mount();
    await ReactTestRenderer.act(async () => {
      await session.submit();
    });
    expect(submitMock).toHaveBeenCalledWith(9, [{ questionId: 1, selectedKeys: ["A"] }], 1);
    expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));
  });
});

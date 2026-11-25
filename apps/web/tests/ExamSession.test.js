import ReactTestRenderer from "react-test-renderer";

import {
  AUTOSAVE_MS,
  SUBMIT_RETRY_MS,
  isTransientError,
  useExamSession,
} from "@/features/exams/hooks/useExamSession";
import {
  fetchExamAttempt,
  saveExamAnswers,
  submitExamAttempt,
} from "@/features/exams/services/examApi";

jest.mock("@/features/exams/services/examApi", () => ({
  fetchExamAttempt: jest.fn(),
  saveExamAnswers: jest.fn(),
  submitExamAttempt: jest.fn(),
}));

const NOW = Date.parse("2026-11-18T10:00:00.000Z");

function attempt(overrides = {}) {
  return {
    id: 9,
    status: "IN_PROGRESS",
    titleZh: "考试",
    titleFr: "Examen",
    serverNow: new Date(NOW).toISOString(),
    deadlineAt: new Date(NOW + 5_000).toISOString(),
    answers: [{ questionId: 1, selectedKeys: ["A"] }],
    questions: [
      { id: 1, type: "single", promptZh: "q1", promptFr: "q1", options: [] },
      { id: 2, type: "multiple", promptZh: "q2", promptFr: "q2", options: [] },
    ],
    ...overrides,
  };
}

let session;
function Harness({ onFinished }) {
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

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
  fetchExamAttempt.mockResolvedValue(attempt());
  saveExamAnswers.mockResolvedValue({ savedAt: "2026-11-18T10:00:30.000Z" });
  submitExamAttempt.mockResolvedValue(attempt({ status: "SUBMITTED" }));
});

afterEach(() => jest.useRealTimers());

test("restores saved answers and submits automatically when time runs out", async () => {
  const onFinished = await mount();
  expect(session.answers).toEqual({ 1: ["A"] });

  await ReactTestRenderer.act(async () => {
    session.select(2, "multiple", "B");
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(6_000);
    await Promise.resolve();
  });

  expect(submitExamAttempt).toHaveBeenCalledTimes(1);
  expect(submitExamAttempt).toHaveBeenCalledWith(9, [
    { questionId: 1, selectedKeys: ["A"] },
    { questionId: 2, selectedKeys: ["B"] },
  ]);
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));
});

test("autosaves changed answers at most every 30 seconds", async () => {
  fetchExamAttempt.mockResolvedValue(attempt({ deadlineAt: null }));
  await mount();
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(AUTOSAVE_MS);
  });
  expect(saveExamAnswers).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    session.select(1, "single", "B");
  });
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(AUTOSAVE_MS);
    await Promise.resolve();
  });
  expect(saveExamAnswers).toHaveBeenCalledTimes(1);
  expect(saveExamAnswers).toHaveBeenCalledWith(9, [{ questionId: 1, selectedKeys: ["B"] }]);
});

test("submits only once even when triggered twice", async () => {
  fetchExamAttempt.mockResolvedValue(attempt({ deadlineAt: null }));
  await mount();
  await ReactTestRenderer.act(async () => {
    await Promise.all([session.submit(), session.submit()]);
  });
  expect(submitExamAttempt).toHaveBeenCalledTimes(1);
});

test("redirects straight to the result when the attempt is already graded", async () => {
  fetchExamAttempt.mockResolvedValue(attempt({ status: "EXPIRED" }));
  const onFinished = await mount();
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "EXPIRED" }));
  expect(session.attempt).toBeNull();
});

test("retries the time-up submission after a network failure, but not after a 4xx", async () => {
  submitExamAttempt
    .mockRejectedValueOnce(Object.assign(new Error("Network Error"), { status: 0 }))
    .mockResolvedValueOnce(attempt({ status: "SUBMITTED" }));
  const onFinished = await mount();
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(6_000);
    await Promise.resolve();
  });
  expect(submitExamAttempt).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(SUBMIT_RETRY_MS);
    await Promise.resolve();
  });
  expect(submitExamAttempt).toHaveBeenCalledTimes(2);
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));

  expect(isTransientError({ status: 409 })).toBe(false);
  expect(isTransientError({ status: 503 })).toBe(true);
  expect(isTransientError(new Error("offline"))).toBe(true);
});

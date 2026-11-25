import ReactTestRenderer from "react-test-renderer";

import { useExamSession } from "@/features/exams/hooks/useExamSession";
import { BREAK_POLL_MS } from "@/features/exams/hooks/useSectionBreak";
import {
  fetchExamAttempt,
  saveExamAnswers,
  startExamSection,
  submitExamAttempt,
} from "@/features/exams/services/examApi";

jest.mock("@/features/exams/services/examApi", () => ({
  fetchExamAttempt: jest.fn(),
  saveExamAnswers: jest.fn(),
  startExamSection: jest.fn(),
  submitExamAttempt: jest.fn(),
}));

const NOW = Date.parse("2026-11-24T10:00:00.000Z");
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const MINUTE = 60_000;

const SECTIONS = [
  { titleZh: "上场：管理制度", titleFr: "Partie 1", timeLimitMinutes: 30, questionCount: 2 },
  { titleZh: "下场：门店现场", titleFr: "Partie 2", timeLimitMinutes: 30, questionCount: 1 },
];

const question = (id) => ({
  id,
  type: "single",
  promptZh: `q${id}`,
  promptFr: `q${id}`,
  options: [],
});

/** Section 0 running, 30 minutes left. */
function firstSection(overrides = {}) {
  return {
    id: 9,
    status: "IN_PROGRESS",
    titleZh: "店长科目一",
    titleFr: "Module 1",
    serverNow: iso(0),
    deadlineAt: iso(30 * MINUTE),
    answers: [],
    sections: SECTIONS,
    sectionIndex: 0,
    breakEndsAt: null,
    questions: [question(1), question(2)],
    result: null,
    ...overrides,
  };
}

/** On the 15-minute break before section 1. */
function onBreak(overrides = {}) {
  return firstSection({
    sectionIndex: 1,
    breakEndsAt: iso(15 * MINUTE),
    deadlineAt: iso(45 * MINUTE),
    questions: [],
    answers: [{ questionId: 1, selectedKeys: ["A"] }],
    ...overrides,
  });
}

function secondSection(overrides = {}) {
  return onBreak({ breakEndsAt: null, questions: [question(3)], ...overrides });
}

let session;
function Harness({ onFinished }) {
  session = useExamSession(9, onFinished);
  return null;
}

const mounted = [];
async function mount(onFinished = jest.fn()) {
  await ReactTestRenderer.act(async () => {
    mounted.push(ReactTestRenderer.create(<Harness onFinished={onFinished} />));
    await Promise.resolve();
  });
  return onFinished;
}

async function advance(ms) {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
  saveExamAnswers.mockResolvedValue({ savedAt: iso(0) });
});

afterEach(() => {
  ReactTestRenderer.act(() => mounted.splice(0).forEach((r) => r.unmount()));
  jest.useRealTimers();
});

test("handing in a non-last section sends its index and opens the break", async () => {
  fetchExamAttempt.mockResolvedValue(firstSection());
  submitExamAttempt.mockResolvedValue(onBreak());
  const onFinished = await mount();
  await ReactTestRenderer.act(async () => session.select(1, "single", "A"));

  await ReactTestRenderer.act(async () => {
    await session.submit();
  });

  expect(submitExamAttempt).toHaveBeenCalledWith(9, [{ questionId: 1, selectedKeys: ["A"] }], 0);
  expect(onFinished).not.toHaveBeenCalled();
  expect(session.sectionBreak.isOnBreak).toBe(true);
  expect(session.sectionBreak.breakRemaining).toBe(15 * MINUTE);
  expect(session.remaining).toBeNull();
});

test("starting the next section early loads its questions", async () => {
  fetchExamAttempt.mockResolvedValue(onBreak());
  startExamSection.mockResolvedValue(secondSection());
  await mount();
  expect(session.sectionBreak.isOnBreak).toBe(true);

  await ReactTestRenderer.act(async () => {
    await session.sectionBreak.startNextSection();
  });

  expect(startExamSection).toHaveBeenCalledWith(9, 1);
  expect(session.sectionBreak.isOnBreak).toBe(false);
  expect(session.attempt.questions.map((q) => q.id)).toEqual([3]);
  expect(session.answers).toEqual({ 1: ["A"] });
});

test("refetches the attempt when the break runs out, and keeps polling until it opens", async () => {
  fetchExamAttempt
    .mockResolvedValueOnce(onBreak({ breakEndsAt: iso(2_000) }))
    .mockResolvedValueOnce(onBreak({ breakEndsAt: iso(2_000), serverNow: iso(2_000) }))
    .mockResolvedValueOnce(secondSection());
  await mount();
  expect(fetchExamAttempt).toHaveBeenCalledTimes(1);

  await advance(2_000);
  expect(fetchExamAttempt).toHaveBeenCalledTimes(2);
  expect(session.sectionBreak.isOnBreak).toBe(true);

  await advance(BREAK_POLL_MS);
  expect(fetchExamAttempt).toHaveBeenCalledTimes(3);
  expect(session.sectionBreak.isOnBreak).toBe(false);
  expect(session.attempt.questions.map((q) => q.id)).toEqual([3]);
});

test("time-up of a section auto-submits it with its index; the last one is graded", async () => {
  fetchExamAttempt.mockResolvedValue(secondSection({ deadlineAt: iso(3_000) }));
  submitExamAttempt.mockResolvedValue({ ...secondSection(), status: "SUBMITTED" });
  const onFinished = await mount();

  await advance(4_000);

  expect(submitExamAttempt).toHaveBeenCalledTimes(1);
  expect(submitExamAttempt).toHaveBeenCalledWith(9, [{ questionId: 1, selectedKeys: ["A"] }], 1);
  expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ status: "SUBMITTED" }));
});

test("does not autosave or submit during the break", async () => {
  fetchExamAttempt.mockResolvedValue(onBreak());
  await mount();
  await ReactTestRenderer.act(async () => {
    expect(await session.submit()).toBeNull();
  });
  await advance(60_000);
  expect(submitExamAttempt).not.toHaveBeenCalled();
  expect(saveExamAnswers).not.toHaveBeenCalled();
});

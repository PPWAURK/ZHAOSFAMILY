import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyExamSession } from "@zhao/types";

import { fetchMyExamSessions } from "@/features/exams/examApi";
import { EXAM_COPY } from "@/features/exams/examCopy";
import { MyExamSessionsCard, sessionStateText } from "@/features/exams/MyExamSessionsCard";

jest.mock("@/features/exams/examApi", () => ({ fetchMyExamSessions: jest.fn() }));

const fetchMock = fetchMyExamSessions as jest.Mock;
const copy = EXAM_COPY.zh;

const session = (overrides: Partial<MyExamSession> = {}): MyExamSession => ({
  id: 1,
  label: null,
  status: "SCHEDULED",
  template: { titleZh: "店长科目一", titleFr: "Gérant 1", timeLimitMinutes: 60 },
  examiner: { name: "王考官" },
  startsAt: null,
  endsAt: null,
  attemptStatus: null,
  ...overrides,
});

async function render() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <MyExamSessionsCard isActive copy={copy} language="zh" />
      </QueryClientProvider>,
    );
  });
  // Let the query settle and its result render.
  await ReactTestRenderer.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return renderer;
}

beforeEach(() => jest.clearAllMocks());

test("describes the state of a registered session", () => {
  expect(sessionStateText(session(), copy)).toBe(copy.mySessions.waiting);
  expect(sessionStateText(session({ status: "OPEN" }), copy)).toBe(copy.mySessions.open);
  expect(sessionStateText(session({ attemptStatus: "IN_PROGRESS" }), copy)).toBe(
    copy.mySessions.inProgress,
  );
  expect(sessionStateText(session({ attemptStatus: "SUBMITTED" }), copy)).toBe(
    copy.mySessions.submitted,
  );
});

test("renders nothing when the user is on no roster", async () => {
  fetchMock.mockResolvedValue([]);
  const renderer = await render();
  expect(renderer.toJSON()).toBeNull();
});

test("lists scheduled sessions with their exam and examiner", async () => {
  fetchMock.mockResolvedValue([session({ status: "OPEN" })]);
  const renderer = await render();
  const texts = renderer.root.findAllByType(Text).map((t) => String(t.props.children));
  expect(texts).toContain("店长科目一");
  expect(texts).toContain(copy.mySessions.open);
  expect(texts).toContain(copy.mySessions.examiner("王考官"));
});

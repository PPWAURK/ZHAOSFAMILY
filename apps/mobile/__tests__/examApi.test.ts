import { startExamSection, submitExamAttempt } from "@/features/exams/examApi";
import { mobileApiClient } from "@/lib/api";

jest.mock("@/lib/api", () => ({ mobileApiClient: { post: jest.fn() } }));

const postMock = mobileApiClient.post as jest.Mock;
const answers = [{ questionId: 1, selectedKeys: ["A"] }];

beforeEach(() => postMock.mockReset().mockResolvedValue({ id: 9 }));

test("single-section submit keeps the old body", async () => {
  await submitExamAttempt(9, answers);
  expect(postMock).toHaveBeenCalledWith("/exam-attempts/9/submit", { answers });
});

test("sectioned submit names the section handed in", async () => {
  await submitExamAttempt(9, answers, 0);
  expect(postMock).toHaveBeenCalledWith("/exam-attempts/9/submit", { answers, sectionIndex: 0 });
});

test("starting the next section early posts its index", async () => {
  await startExamSection(9, 1);
  expect(postMock).toHaveBeenCalledWith("/exam-attempts/9/sections/start", { sectionIndex: 1 });
});

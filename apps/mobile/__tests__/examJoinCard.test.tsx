import ReactTestRenderer from "react-test-renderer";
import { Text, TextInput } from "react-native";

import { joinExamSession } from "@/features/exams/examApi";
import { EXAM_COPY } from "@/features/exams/examCopy";
import { ExamJoinCard, normalizeSessionCode } from "@/features/exams/ExamJoinCard";

jest.mock("@/features/exams/examApi", () => ({ joinExamSession: jest.fn() }));

const joinMock = joinExamSession as jest.Mock;
const copy = EXAM_COPY.zh;

async function render(onJoined = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<ExamJoinCard copy={copy} onJoined={onJoined} />);
  });
  return { renderer, onJoined };
}

async function typeCode(renderer: ReactTestRenderer.ReactTestRenderer, value: string) {
  await ReactTestRenderer.act(async () => {
    renderer.root.findByType(TextInput).props.onChangeText(value);
  });
}

function joinButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll((node) => typeof node.props.onPress === "function")
    .filter((node) => node.findAllByType(Text).some((t) => t.props.children === copy.join.button))
    .at(-1)!;
}

beforeEach(() => jest.clearAllMocks());

test("keeps only six digits", () => {
  expect(normalizeSessionCode("04 82-13 99")).toBe("048213");
});

test("joins with a complete code and hands over the attempt", async () => {
  joinMock.mockResolvedValue({ id: 99 });
  const { renderer, onJoined } = await render();
  await typeCode(renderer, "4821");
  expect(joinButton(renderer).props.disabled).toBe(true);

  await typeCode(renderer, "482139");
  await ReactTestRenderer.act(async () => {
    joinButton(renderer).props.onPress();
  });
  expect(joinMock).toHaveBeenCalledWith("482139");
  expect(onJoined).toHaveBeenCalledWith({ id: 99 });
});

test("explains why a code was refused", async () => {
  joinMock.mockRejectedValue(new Error("EXAM_SESSION_ALREADY_TAKEN"));
  const { renderer, onJoined } = await render();
  await typeCode(renderer, "123456");
  await ReactTestRenderer.act(async () => {
    joinButton(renderer).props.onPress();
  });
  const texts = renderer.root.findAllByType(Text).map((t) => t.props.children);
  expect(texts).toContain(copy.errors.EXAM_SESSION_ALREADY_TAKEN);
  expect(onJoined).not.toHaveBeenCalled();
});

import ReactTestRenderer from "react-test-renderer";

import CoveragePanel from "@/features/exams/components/CoveragePanel";
import MaterialEditorModal from "@/features/exams/components/MaterialEditorModal";
import { EXAM_BANK_COPY } from "@/features/exams/constants/exam-bank-copy";
import { EXAM_MATERIAL_COPY } from "@/features/exams/constants/exam-material-copy";
import { fetchExamCategories } from "@/features/exams/services/examQuestionsApi";
import {
  createGenerationJob,
  estimateGenerationJob,
  fetchGenerationCoverage,
} from "@/features/exams/services/generationJobsApi";

jest.mock("@/features/exams/services/examQuestionsApi", () => ({ fetchExamCategories: jest.fn() }));
jest.mock("@/features/exams/services/generationJobsApi", () => ({
  createGenerationJob: jest.fn(),
  estimateGenerationJob: jest.fn(),
  fetchGenerationCoverage: jest.fn(),
}));

const counts = (recall, understand, scenario) => ({ recall, understand, scenario });
const coverage = (materialId, overrides = {}) => ({
  materialId,
  title: `材料${materialId}`,
  status: "READY",
  categoryId: null,
  targets: counts(4, 3, 3),
  approved: counts(2, 1, 0),
  draft: counts(0, 0, 0),
  missing: counts(2, 2, 3),
  ...overrides,
});

async function render(element) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(element);
    await Promise.resolve();
  });
  return renderer;
}

const textOf = (node) => [].concat(node.props.children).join("");
const button = (renderer, text) =>
  renderer.root.findAllByType("button").find((b) => textOf(b) === text);
async function click(target) {
  await ReactTestRenderer.act(async () => target.props.onClick());
}

beforeEach(() => jest.clearAllMocks());

test("按目标补题 estimates the selected gaps, then creates a TARGET job on confirmation", async () => {
  fetchExamCategories.mockResolvedValue([]);
  fetchGenerationCoverage.mockResolvedValue([
    coverage(1),
    coverage(2, { missing: counts(0, 0, 0) }),
    coverage(3, { targets: null }),
  ]);
  estimateGenerationJob.mockResolvedValue({
    plannedCount: 7,
    requestCount: 1,
    maxPossible: 50,
    isCapped: false,
    estimatedInputTokens: 1,
    estimatedOutputTokens: 1,
    estimatedCostUsd: 0.12,
  });
  createGenerationJob.mockResolvedValue({ id: 5 });
  const onCreated = jest.fn();
  const renderer = await render(
    <CoveragePanel lang="zh" refreshKey={0} cancelLabel="取消" onCreated={onCreated} />,
  );
  const labels = EXAM_MATERIAL_COPY.zh.coverage;

  expect(button(renderer, labels.fill).props.disabled).toBe(true);
  await click(button(renderer, labels.selectMissing));
  await click(button(renderer, labels.fill));
  expect(estimateGenerationJob).toHaveBeenCalledWith({ mode: "TARGET", materialIds: [1] });
  expect(createGenerationJob).not.toHaveBeenCalled();
  expect(
    renderer.root.findAll((n) => n.type === "p" && textOf(n).startsWith("将生成 7 道缺口题")),
  ).toHaveLength(1);

  await click(button(renderer, labels.confirm));
  expect(createGenerationJob).toHaveBeenCalledWith({ mode: "TARGET", materialIds: [1] });
  expect(onCreated).toHaveBeenCalledTimes(1);
});

test("material targets: a profile preset fills the numbers, clearing sends null", async () => {
  const onSave = jest.fn();
  const renderer = await render(
    <MaterialEditorModal
      material={{ id: 1, title: "红线", categoryId: null, targets: null }}
      categories={[]}
      copy={EXAM_BANK_COPY.zh}
      labels={EXAM_MATERIAL_COPY.zh}
      error={null}
      isSaving={false}
      onSave={onSave}
      onClose={jest.fn()}
    />,
  );
  const total = renderer.root.findAll((n) => n.type === "input" && n.props.type === "number")[0];
  await ReactTestRenderer.act(async () => total.props.onChange({ target: { value: "10" } }));
  await click(button(renderer, "偏记忆 5:3:2"));
  const submit = () =>
    ReactTestRenderer.act(async () =>
      renderer.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }),
    );
  await submit();
  expect(onSave).toHaveBeenLastCalledWith({
    title: "红线",
    categoryId: null,
    targets: counts(5, 3, 2),
  });

  await click(button(renderer, "清除目标"));
  await submit();
  expect(onSave).toHaveBeenLastCalledWith({ title: "红线", categoryId: null, targets: null });
});

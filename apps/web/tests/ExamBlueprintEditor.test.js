import ReactTestRenderer from "react-test-renderer";

import TemplateEditorModal from "@/features/exams/components/TemplateEditorModal";
import { EXAM_BANK_COPY } from "@/features/exams/constants/exam-bank-copy";
import { DEBOUNCE_MS } from "@/features/exams/hooks/useDebouncedRequest";
import { checkExamBlueprint, checkExamPool } from "@/features/exams/services/examTemplatesApi";

jest.mock("@/features/exams/services/examTemplatesApi", () => ({
  checkExamBlueprint: jest.fn(),
  checkExamPool: jest.fn(),
}));

const copy = EXAM_BANK_COPY.zh;

const material = (id, title) => ({ id, title, status: "READY" });
const MATERIALS = [material(1, "红线与黑线制度"), material(2, "排班制度"), material(3, "门店现场")];
const CATEGORIES = [
  { id: 7, code: "culture", nameZh: "企业文化", nameFr: "Culture", sortOrder: 0, isActive: true },
];

function template(overrides = {}) {
  return {
    id: 1,
    titleZh: "店长科目一",
    titleFr: "Module 1",
    descriptionZh: null,
    descriptionFr: null,
    singleCount: 4,
    multipleCount: 1,
    booleanCount: 0,
    questionCount: 5,
    categoryIds: [],
    materialIds: [],
    difficulties: [],
    timeLimitMinutes: 30,
    passingScore: 90,
    maxAttempts: null,
    shuffleOptions: true,
    showExplanations: false,
    isActive: true,
    accessMode: "CODE",
    sectionCount: 1,
    attemptCount: 0,
    blueprint: {
      breakMinutes: 15,
      rules: [{ categoryId: 7, maxWrong: 1 }],
      sections: [
        {
          titleZh: "上场：管理制度",
          titleFr: "Partie 1 : Gestion",
          timeLimitMinutes: 30,
          typeCounts: { single: 4, multiple: 1, boolean: 0 },
          items: [
            { materialId: 1, count: 5, difficulty: { recall: 2, understand: 2, scenario: 1 } },
          ],
        },
      ],
    },
    ...overrides,
  };
}

function sufficiency(isSufficient, available) {
  return {
    isSufficient,
    sections: [
      {
        index: 0,
        requiredTypes: { single: 4, multiple: 1, boolean: 0 },
        isTypeMixFeasible: true,
        items: [
          {
            materialId: 1,
            materialTitle: "红线与黑线制度",
            count: 5,
            isSufficient,
            cells: [
              { difficulty: "recall", required: 2, available },
              { difficulty: "understand", required: 2, available: 6 },
              { difficulty: "scenario", required: 1, available: 3 },
            ],
          },
        ],
      },
    ],
  };
}

const onSave = jest.fn();
const mounted = [];

async function render(props = {}) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <TemplateEditorModal
        template={template()}
        categories={CATEGORIES}
        materials={MATERIALS}
        copy={copy}
        lang="zh"
        error={null}
        onSave={onSave}
        onClose={jest.fn()}
        {...props}
      />,
    );
  });
  mounted.push(renderer);
  return renderer;
}

async function settle() {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
    await Promise.resolve();
  });
}

/** Text of a node, rendered children included (elements and nested arrays). */
const textOf = (node) =>
  [node.props.children]
    .flat(Infinity)
    .map((child) => {
      if (child === null || child === undefined || typeof child === "boolean") return "";
      return typeof child === "object" ? textOf(child) : String(child);
    })
    .join("");
const byTestId = (renderer, id) => renderer.root.findAll((n) => n.props["data-testid"] === id);
const inputLabelled = (renderer, label) =>
  renderer.root.findAll((n) => n.type === "input" && n.props["aria-label"] === label);
const hasText = (renderer, text) =>
  renderer.root.findAll((n) => typeof n.type === "string" && textOf(n).includes(text)).length > 0;

async function change(input, value) {
  await ReactTestRenderer.act(async () => input.props.onChange({ target: { value } }));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  checkExamBlueprint.mockResolvedValue(sufficiency(true, 5));
  checkExamPool.mockResolvedValue({ isSufficient: true, requested: {}, available: {} });
});

afterEach(() => {
  ReactTestRenderer.act(() => mounted.splice(0).forEach((r) => r.unmount()));
  jest.useRealTimers();
});

test("opens a sectioned template in the 分场组卷 mode and checks the bank after a pause", async () => {
  const renderer = await render();
  const sectioned = renderer.root.findAll(
    (n) => n.type === "input" && n.props.value === "sectioned",
  );
  expect(sectioned[0].props.checked).toBe(true);
  expect(checkExamBlueprint).not.toHaveBeenCalled();
  expect(checkExamPool).not.toHaveBeenCalled();

  await settle();
  expect(checkExamBlueprint).toHaveBeenCalledTimes(1);
  expect(checkExamBlueprint.mock.calls[0][0].sections[0].items).toEqual([
    { materialId: 1, count: 5, difficulty: { recall: 2, understand: 2, scenario: 1 } },
  ]);
  expect(hasText(renderer, "题库足够,可以启用。")).toBe(true);
  expect(hasText(renderer, "记忆 2/5")).toBe(true);
});

test("shows the live type sum and flags a mismatch with the files", async () => {
  const renderer = await render();
  const [typeSum] = byTestId(renderer, "type-sum");
  expect(textOf(typeSum)).toBe("题型合计 5 / 文件题数 5 · 一致");

  const single = renderer.root.findAll((n) => n.type === "input" && n.props.value === 4)[0];
  await change(single, "6");
  const [updated] = byTestId(renderer, "type-sum");
  expect(textOf(updated)).toBe("题型合计 7 / 文件题数 5 · 不一致");
  expect(updated.props.className).toBe("sumBad");
  expect(hasText(renderer, "每一场的单选、多选、判断题数合计要等于该场各文件题数之和。")).toBe(
    true,
  );
});

test("flags a fixed difficulty split that does not add up to the file's count", async () => {
  const renderer = await render();
  expect(textOf(byTestId(renderer, "split-sum")[0])).toBe("5 / 5");

  await change(inputLabelled(renderer, "情景")[0], "3");
  const [splitSum] = byTestId(renderer, "split-sum");
  expect(textOf(splitSum)).toBe("7 / 5");
  expect(splitSum.props.className).toBe("cellAlert");
  expect(hasText(renderer, "固定难度的三个数加起来要等于该文件的题数。")).toBe(true);
});

test("blocks saving an active paper the bank cannot fill and marks the gap", async () => {
  checkExamBlueprint.mockResolvedValue(sufficiency(false, 1));
  const renderer = await render();
  await settle();

  expect(hasText(renderer, "题库里已通过的题目不足")).toBe(true);
  const gap = renderer.root.findAll((n) => n.type === "span" && textOf(n) === "记忆 2/1");
  expect(gap[0].props.className).toBe("cellAlert");
  const save = renderer.root.findAll((n) => n.type === "button" && n.props.type === "submit")[0];
  expect(save.props.disabled).toBe(true);
});

test("hides materials already used in another row and saves the blueprint", async () => {
  const renderer = await render();
  await ReactTestRenderer.act(async () =>
    renderer.root
      .findAll((n) => n.type === "button" && textOf(n) === "添加文件")[0]
      .props.onClick(),
  );
  const selects = renderer.root.findAll(
    (n) => n.type === "select" && n.props["aria-label"] === "文件",
  );
  const options = selects[1].findAllByType("option").map(textOf);
  expect(options).toEqual(["选择文件", "排班制度", "门店现场"]);

  await ReactTestRenderer.act(async () =>
    renderer.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }),
  );
  const input = onSave.mock.calls[0][0];
  expect(input.blueprint.sections[0].items).toHaveLength(2);
  expect(input).not.toHaveProperty("singleCount");
});

test("switching back to simple mode checks the pool and clears the blueprint on save", async () => {
  const renderer = await render();
  const simple = renderer.root.findAll((n) => n.type === "input" && n.props.value === "simple")[0];
  await ReactTestRenderer.act(async () => simple.props.onChange());
  await settle();
  expect(checkExamPool).toHaveBeenCalled();

  await ReactTestRenderer.act(async () =>
    renderer.root.findByType("form").props.onSubmit({ preventDefault: jest.fn() }),
  );
  expect(onSave.mock.calls[0][0]).toMatchObject({ blueprint: null, singleCount: 4 });
});

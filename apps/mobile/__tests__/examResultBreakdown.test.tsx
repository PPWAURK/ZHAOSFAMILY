import ReactTestRenderer from "react-test-renderer";
import { Text } from "react-native";

import { EXAM_COPY } from "@/features/exams/examCopy";
import { describeExamVeto, ExamResultBreakdown } from "@/features/exams/ExamResultBreakdown";

const copy = EXAM_COPY.zh;
const cultureRule = (wrongCount: number) => ({
  categoryId: 4,
  labelZh: "企业文化",
  labelFr: "Culture d'entreprise",
  maxWrong: 1,
  totalCount: 9,
  wrongCount,
  passed: wrongCount <= 1,
});
const sections = [
  { titleZh: "上场：管理制度", titleFr: "Partie 1 : Gestion", correctCount: 46, totalCount: 49 },
  { titleZh: "下场：门店现场", titleFr: "Partie 2 : Terrain", correctCount: 48, totalCount: 51 },
];

async function render(props: Partial<Parameters<typeof ExamResultBreakdown>[0]> = {}) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ExamResultBreakdown
        score={94}
        passingScore={90}
        passed={false}
        sections={sections}
        rules={[cultureRule(2)]}
        copy={copy}
        language="zh"
        {...props}
      />,
    );
  });
  return renderer.root.findAllByType(Text).map((node) => [].concat(node.props.children).join(""));
}

test("explains a fail caused by a rule although the score reached the pass mark", async () => {
  const texts = await render();
  expect(texts).toContain("企业文化 错 2 题（最多允许错 1 题），本次考试不通过");
  expect(texts).toContain(copy.result.correctCount(46, 49));
  expect(texts).toContain("下场：门店现场");
  expect(texts).toContain(copy.result.ruleLine(2, 1));
});

test("no rule message when the score alone fails the paper or the paper passed", () => {
  const base = { passingScore: 90, rules: [cultureRule(2)] };
  expect(describeExamVeto({ ...base, score: 85, passed: false }, copy, "zh")).toBeNull();
  expect(
    describeExamVeto({ ...base, score: 95, passed: true, rules: [cultureRule(1)] }, copy, "zh"),
  ).toBeNull();
});

test("uses the French label in French", () => {
  const message = describeExamVeto(
    { score: 92, passingScore: 90, passed: false, rules: [cultureRule(3)] },
    EXAM_COPY.fr,
    "fr",
  );
  expect(message).toBe(
    "Culture d'entreprise : 3 erreur(s) (1 au maximum), l'examen n'est donc pas réussi",
  );
});

test("renders nothing extra for a simple paper", async () => {
  const texts = await render({ sections: null, rules: [], passed: true });
  expect(texts).toEqual([]);
});

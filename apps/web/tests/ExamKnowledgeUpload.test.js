import ReactTestRenderer from "react-test-renderer";

import KnowledgeUploadForm from "@/features/exams/components/KnowledgeUploadForm";
import { EXAM_BANK_COPY } from "@/features/exams/constants/exam-bank-copy";
import { uploadKnowledgeMaterial } from "@/features/exams/services/knowledgeBaseApi";

jest.mock("@/features/exams/services/knowledgeBaseApi", () => ({
  uploadKnowledgeMaterial: jest.fn(),
}));

const copy = EXAM_BANK_COPY.zh;
const fileNamed = (name) => ({ name });

async function render(onUploaded = jest.fn()) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <KnowledgeUploadForm
        copy={copy}
        lang="zh"
        categories={[
          {
            id: 4,
            code: "culture",
            nameZh: "企业文化",
            nameFr: "Culture",
            sortOrder: 0,
            isActive: true,
          },
        ]}
        noCategoryLabel="—"
        onUploaded={onUploaded}
      />,
    );
  });
  return renderer;
}

async function pickFiles(renderer, files) {
  const input = renderer.root.findAll((n) => n.type === "input" && n.props.type === "file")[0];
  await ReactTestRenderer.act(async () => input.props.onChange({ target: { files } }));
}

async function submit(renderer) {
  const form = renderer.root.findByType("form");
  await ReactTestRenderer.act(async () =>
    form.props.onSubmit({ preventDefault: () => {}, currentTarget: { reset: () => {} } }),
  );
}

beforeEach(() => jest.clearAllMocks());

test("has no title field: every selected file is uploaded and titled by the server", async () => {
  uploadKnowledgeMaterial.mockResolvedValue({});
  const onUploaded = jest.fn();
  const renderer = await render(onUploaded);
  expect(
    renderer.root.findAll((n) => n.type === "input" && n.props.required && n.props.type !== "file"),
  ).toHaveLength(0);

  await pickFiles(renderer, [fileNamed("红线制度.docx"), fileNamed("黑线制度.docx")]);
  await submit(renderer);

  expect(uploadKnowledgeMaterial).toHaveBeenCalledTimes(2);
  expect(uploadKnowledgeMaterial.mock.calls[0][0]).toEqual({
    file: fileNamed("红线制度.docx"),
    description: undefined,
    categoryId: undefined,
  });
  expect(onUploaded).toHaveBeenCalledTimes(1);
});

test("keeps going after a failed file and lists the failures by file name", async () => {
  uploadKnowledgeMaterial
    .mockRejectedValueOnce(new Error("KB_FILE_TOO_LARGE"))
    .mockResolvedValueOnce({});
  const renderer = await render();

  await pickFiles(renderer, [fileNamed("大文件.pdf"), fileNamed("小文件.pdf")]);
  await submit(renderer);

  expect(uploadKnowledgeMaterial).toHaveBeenCalledTimes(2);
  const errors = renderer.root
    .findAll((n) => n.type === "p" && String(n.props.children).startsWith("大文件.pdf: "))
    .map((n) => n.props.children);
  expect(errors).toHaveLength(1);
});

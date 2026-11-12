import { createRef } from "react";
import ReactTestRenderer from "react-test-renderer";
import { Modal } from "react-native";

import {
  NewsPdfPreviewModal,
  type NewsPdfPreviewHandle,
} from "@/features/dashboard/NewsPdfPreviewModal";
import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import { createDashboardNewsPdfViewer } from "@/features/dashboard/dashboardNewsPdfPreview";

jest.mock("react-native-webview", () => ({ WebView: () => null }));
jest.mock("@/components/ZhaoLoadingIndicator", () => ({ ZhaoLoadingIndicator: () => null }));
jest.mock("@/features/dashboard/dashboardNewsPdfPreview", () => ({
  createDashboardNewsPdfViewer: jest.fn(),
}));

const copy = {
  newsPdfPreview: "PDF",
  newsPdfPreviewError: "error",
  newsPdfPreviewLoading: "loading",
  newsReaderClose: "close",
};

const post = {
  id: "1",
  attachment: { name: "doc.pdf", href: "https://x/doc.pdf", objectKey: "k", mimeType: "application/pdf" },
} as unknown as DashboardNewsPost;

async function mount(): Promise<{
  handle: React.RefObject<NewsPdfPreviewHandle | null>;
  renderer: ReactTestRenderer.ReactTestRenderer;
}> {
  const handle = createRef<NewsPdfPreviewHandle>();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NewsPdfPreviewModal ref={handle} copy={copy} userId={7} />,
    );
  });

  return { handle, renderer };
}

describe("NewsPdfPreviewModal", () => {
  beforeEach(() => {
    jest.mocked(createDashboardNewsPdfViewer).mockReset();
  });

  it("is hidden until opened", async () => {
    const { renderer } = await mount();

    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });

  it("opens for a post and downloads the viewer with the user id", async () => {
    jest.mocked(createDashboardNewsPdfViewer).mockResolvedValue({ baseUri: "b", fileUri: "f" });
    const { handle, renderer } = await mount();

    await ReactTestRenderer.act(async () => {
      await handle.current?.open(post);
    });

    expect(renderer.root.findByType(Modal).props.visible).toBe(true);
    expect(createDashboardNewsPdfViewer).toHaveBeenCalledWith(post.attachment, 7);
  });

  it("closes through the handle", async () => {
    jest.mocked(createDashboardNewsPdfViewer).mockResolvedValue({ baseUri: "b", fileUri: "f" });
    const { handle, renderer } = await mount();

    await ReactTestRenderer.act(async () => {
      await handle.current?.open(post);
    });
    await ReactTestRenderer.act(async () => {
      handle.current?.close();
    });

    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });
});

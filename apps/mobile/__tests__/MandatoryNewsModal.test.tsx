import ReactTestRenderer from "react-test-renderer";
import { Modal, ScrollView } from "react-native";

import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import {
  MandatoryNewsModal,
  type MandatoryNewsCopy,
} from "@/features/dashboard/MandatoryNewsModal";

jest.mock("react-native-webview", () => ({ WebView: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/components/ZhaoLoadingIndicator", () => ({ ZhaoLoadingIndicator: () => null }));
jest.mock("@/components/RemoteImage", () => ({ RemoteImage: () => null }));
jest.mock("@/features/dashboard/dashboardNewsPdfPreview", () => ({
  createDashboardNewsPdfViewer: jest.fn(),
}));

const copy: MandatoryNewsCopy = {
  deletedEmployee: "deleted",
  newsAttachment: "attachment",
  newsConfirmRead: "confirm",
  newsMandatoryHint: "hint",
  newsMandatoryTitle: "title",
  newsOpenAttachment: "open",
  newsPdfPreviewError: "error",
  newsPdfPreviewLoading: "loading",
};

const post = {
  id: "p1",
  title: "Policy",
  summary: "Summary",
  body: "Line one\nLine two",
  createdAt: "2026-01-01T00:00:00.000Z",
  authorName: "Chef",
  restaurantName: "Zhao",
  attachment: null,
} as unknown as DashboardNewsPost;

interface Overrides {
  isConfirming?: boolean;
  isOffline?: boolean;
  onConfirm?: (postId: string) => void;
  post?: DashboardNewsPost | null;
}

async function mount(
  overrides: Overrides = {},
): Promise<ReactTestRenderer.ReactTestRenderer> {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <MandatoryNewsModal
        confirmMessage=""
        copy={copy}
        isConfirming={overrides.isConfirming ?? false}
        isOffline={overrides.isOffline ?? false}
        post={overrides.post === undefined ? post : overrides.post}
        userId={7}
        onConfirm={overrides.onConfirm ?? jest.fn()}
        onOpenAttachment={jest.fn()}
      />,
    );
  });

  return renderer;
}

function confirmButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    (node) =>
      typeof node.type !== "string" &&
      typeof node.props.onPress === "function" &&
      "disabled" in node.props,
  );
}

function scrollToEnd(renderer: ReactTestRenderer.ReactTestRenderer): void {
  const scroll = renderer.root.findByType(ScrollView);

  ReactTestRenderer.act(() => {
    scroll.props.onScroll({
      nativeEvent: {
        contentOffset: { y: 700 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 300 },
      },
    });
  });
}

describe("MandatoryNewsModal", () => {
  it("is hidden when there is no mandatory post", async () => {
    const renderer = await mount({ post: null });

    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });

  it("keeps confirm disabled until the reader scrolls to the end", async () => {
    const onConfirm = jest.fn();
    const renderer = await mount({ onConfirm });

    expect(confirmButton(renderer).props.disabled).toBe(true);

    scrollToEnd(renderer);

    expect(confirmButton(renderer).props.disabled).toBe(false);

    ReactTestRenderer.act(() => confirmButton(renderer).props.onPress());
    expect(onConfirm).toHaveBeenCalledWith("p1");
  });

  it("enables confirm immediately when the content fits the viewport", async () => {
    const renderer = await mount();
    const scroll = renderer.root.findByType(ScrollView);

    ReactTestRenderer.act(() => {
      scroll.props.onContentSizeChange(0, 200);
      scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    });

    expect(confirmButton(renderer).props.disabled).toBe(false);
  });

  it("stays disabled while offline or while a confirmation is in flight", async () => {
    const offline = await mount({ isOffline: true });
    scrollToEnd(offline);
    expect(confirmButton(offline).props.disabled).toBe(true);

    const confirming = await mount({ isConfirming: true });
    scrollToEnd(confirming);
    expect(confirmButton(confirming).props.disabled).toBe(true);
  });
});

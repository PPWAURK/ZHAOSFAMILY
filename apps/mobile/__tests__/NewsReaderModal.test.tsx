import ReactTestRenderer from "react-test-renderer";
import { Modal, Text } from "react-native";

import type { DashboardNewsPost } from "@/features/dashboard/dashboardNewsApi";
import {
  NewsReaderModal,
  type NewsReaderCopy,
  type NewsReadStatusState,
} from "@/features/dashboard/NewsReaderModal";

jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");

  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock("@/components/PlatformBlurView", () => ({
  PlatformBlurView: ({ children }: { children: unknown }) => children,
}));
jest.mock("@/components/ZhaoLoadingIndicator", () => ({ ZhaoLoadingIndicator: () => null }));
jest.mock("@/components/RemoteImage", () => ({ RemoteImage: () => null }));

const copy = {
  deletedEmployee: "deleted",
  newsAttachment: "attachment",
  newsCategories: { news: "News", training: "Training", policy: "Policy" },
  newsConfirmRead: "confirm-read",
  newsNotRead: "not-read",
  newsOpenAttachment: "open",
  newsReadConfirmedAt: "confirmed-at",
  newsReadList: "read-list",
  newsReadProgress: (read: number, total: number) => `${read}/${total}`,
  newsReadStatusLoading: "status-loading",
  newsReadTrackingUnavailable: "tracking-unavailable",
  newsReaderClose: "close",
  newsReaderLoading: "loading",
  newsUnreadList: "unread-list",
  newsViewReadDetails: "view-details",
} as unknown as NewsReaderCopy;

const basePost = {
  id: "n1",
  category: "news",
  title: "Title",
  summary: "Summary",
  body: "Body text",
  createdAt: "2026-01-01T00:00:00.000Z",
  authorName: "Chef",
  restaurantName: "Zhao",
  tags: ["a"],
  attachment: null,
  readConfirmation: { isRequired: true, confirmedAt: null },
  readSummary: { readCount: 1, totalRecipients: 2, readRate: 50 },
} as unknown as DashboardNewsPost;

const idleStatus: NewsReadStatusState = { postId: "", status: null, error: "", isLoading: false };

interface Overrides {
  canViewReadStats?: boolean;
  isOffline?: boolean;
  post?: DashboardNewsPost | null;
  readStatus?: NewsReadStatusState;
  onConfirm?: (postId: string) => void;
  onLoadReadStatus?: (postId: string) => void;
}

async function mount(overrides: Overrides = {}): Promise<ReactTestRenderer.ReactTestRenderer> {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <NewsReaderModal
        canViewReadStats={overrides.canViewReadStats ?? false}
        confirmMessage=""
        confirmingPostId=""
        copy={copy}
        error=""
        isLoading={false}
        isOffline={overrides.isOffline ?? false}
        post={overrides.post === undefined ? basePost : overrides.post}
        readStatus={overrides.readStatus ?? idleStatus}
        onClose={jest.fn()}
        onConfirm={overrides.onConfirm ?? jest.fn()}
        onLoadReadStatus={overrides.onLoadReadStatus ?? jest.fn()}
        onOpenAttachment={jest.fn()}
      />,
    );
  });

  return renderer;
}

function pressableWithText(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    (node) =>
      typeof node.type !== "string" &&
      typeof node.props.onPress === "function" &&
      node.findAllByType(Text).some((text) => text.props.children === label),
  );
}

function allText(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return renderer.root
    .findAllByType(Text)
    .map((node) => [node.props.children].flat().join(""))
    .join("|");
}

describe("NewsReaderModal", () => {
  it("is hidden without a selected post", async () => {
    const renderer = await mount({ post: null });

    expect(renderer.root.findByType(Modal).props.visible).toBe(false);
  });

  it("shows the post and confirms a required read", async () => {
    const onConfirm = jest.fn();
    const renderer = await mount({ onConfirm });

    expect(allText(renderer)).toContain("Title");

    ReactTestRenderer.act(() => pressableWithText(renderer, "confirm-read").props.onPress());
    expect(onConfirm).toHaveBeenCalledWith("n1");
  });

  it("disables the confirm button while offline", async () => {
    const renderer = await mount({ isOffline: true });

    expect(pressableWithText(renderer, "confirm-read").props.disabled).toBe(true);
  });

  it("hides read statistics for users who cannot view them", async () => {
    const renderer = await mount({ canViewReadStats: false });

    expect(allText(renderer)).not.toContain("view-details");
  });

  it("loads read details and switches between read and unread lists", async () => {
    const onLoadReadStatus = jest.fn();
    const readStatus: NewsReadStatusState = {
      postId: "n1",
      error: "",
      isLoading: false,
      status: {
        isTracked: true,
        read: [{ userId: 1, name: "Alice", restaurantName: "R1", confirmedAt: "2026-01-02" }],
        unread: [{ userId: 2, name: "Bob", restaurantName: "R2", confirmedAt: null }],
      },
    } as unknown as NewsReadStatusState;
    const renderer = await mount({ canViewReadStats: true, onLoadReadStatus, readStatus });

    ReactTestRenderer.act(() => pressableWithText(renderer, "view-details").props.onPress());
    expect(onLoadReadStatus).toHaveBeenCalledWith("n1");

    expect(allText(renderer)).toContain("Alice");
    expect(allText(renderer)).not.toContain("Bob");

    ReactTestRenderer.act(() => pressableWithText(renderer, "unread-list").props.onPress());
    expect(allText(renderer)).toContain("Bob");
    expect(allText(renderer)).not.toContain("Alice");
  });
});

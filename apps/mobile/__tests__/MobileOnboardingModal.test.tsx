import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { MobileOnboardingModal } from "@/features/onboarding/MobileOnboardingModal";

const renderers: ReactTestRenderer.ReactTestRenderer[] = [];

async function renderModal(options?: {
  isReplay?: boolean;
  onComplete?: (destination: "home" | "training" | null) => Promise<void>;
  showOrderStep?: boolean;
}): Promise<ReactTestRenderer.ReactTestRenderer> {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <MobileOnboardingModal
        isReplay={options?.isReplay ?? false}
        language="zh"
        reduceMotionOverride
        showOrderStep={options?.showOrderStep ?? false}
        targets={{
          congrats: { height: 52, width: 100, x: 132, y: 108 },
          issues: { height: 52, width: 100, x: 250, y: 108 },
          more: { height: 34, width: 34, x: 360, y: 78 },
          news: { height: 52, width: 100, x: 30, y: 108 },
          orders: { height: 68, width: 56, x: 70, y: 288 },
          training: { height: 68, width: 56, x: 326, y: 288 },
        }}
        visible
        onComplete={options?.onComplete ?? jest.fn().mockResolvedValue(undefined)}
      />,
    );
    await Promise.resolve();
  });

  if (!renderer) throw new Error("ONBOARDING_RENDER_FAILED");

  renderers.push(renderer);

  return renderer;
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
): Promise<void> {
  const button = renderer.root.findByProps({ accessibilityLabel });

  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
}

describe("MobileOnboardingModal", () => {
  afterEach(() => {
    ReactTestRenderer.act(() => {
      renderers.splice(0).forEach((renderer) => renderer.unmount());
    });
  });

  it(
    "persists a skipped first-run guide as staying on the home screen",
    async () => {
      const onComplete = jest.fn().mockResolvedValue(undefined);
      const renderer = await renderModal({ onComplete });

      await press(renderer, "跳过引导");

      expect(onComplete).toHaveBeenCalledWith("home");
    },
    15_000,
  );

  it("starts training after the final first-run step", async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    const renderer = await renderModal({ onComplete });

    await press(renderer, "下一步");
    await press(renderer, "下一步");
    await press(renderer, "下一步");
    await press(renderer, "下一步");
    await press(renderer, "开始我的培训");

    expect(onComplete).toHaveBeenCalledWith("training");
  });

  it("adds the order-flow guide only when the order entry is available", async () => {
    const renderer = await renderModal({ showOrderStep: true });

    await press(renderer, "下一步");
    await press(renderer, "下一步");
    await press(renderer, "下一步");

    expect(renderer.root.findByProps({ children: "下单流程" })).toBeTruthy();
    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props.children === "string" && node.props.children.includes("选择供应商"),
      ),
    ).not.toHaveLength(0);
  });

  it("keeps the guide visible and reports a save failure", async () => {
    const onComplete = jest.fn().mockRejectedValue(new Error("NETWORK"));
    const renderer = await renderModal({ onComplete });

    await press(renderer, "跳过引导");

    expect(renderer.root.findByProps({ accessibilityRole: "alert" }).props.children).toContain(
      "暂时无法保存引导状态",
    );
  });

  it("reports a replay completion without a persistence destination", async () => {
    const onComplete = jest.fn().mockResolvedValue(undefined);
    const renderer = await renderModal({ isReplay: true, onComplete });

    await press(renderer, "关闭");

    expect(onComplete).toHaveBeenCalledWith(null);
  });
});

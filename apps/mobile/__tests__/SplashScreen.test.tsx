import ReactTestRenderer from "react-test-renderer";
import { AccessibilityInfo } from "react-native";
import { SplashScreen } from "../src/features/splash/SplashScreen";

test("renders the reduced-motion splash without native artwork dependencies", async () => {
  jest.useFakeTimers();

  const onFinish = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  try {
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SplashScreen onFinish={onFinish} reduceMotionOverride />,
      );
    });

    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(onFinish).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
  } finally {
    jest.useRealTimers();
  }
});

test("falls back to full motion when accessibility settings cannot be read", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockRejectedValue(
    new Error("Accessibility settings unavailable"),
  );
  jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
    remove: jest.fn(),
  } as never);

  const rendererRef: { current?: ReactTestRenderer.ReactTestRenderer } = {};

  await ReactTestRenderer.act(async () => {
    rendererRef.current = ReactTestRenderer.create(<SplashScreen />);
    await Promise.resolve();
  });

  expect(rendererRef.current?.root).toBeDefined();
  ReactTestRenderer.act(() => rendererRef.current?.unmount());
  jest.restoreAllMocks();
});

test("applies the resolved motion setting while mounted", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({
    remove: jest.fn(),
  } as never);

  const rendererRef: { current?: ReactTestRenderer.ReactTestRenderer } = {};
  await ReactTestRenderer.act(async () => {
    rendererRef.current = ReactTestRenderer.create(<SplashScreen />);
    await Promise.resolve();
  });

  expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  ReactTestRenderer.act(() => rendererRef.current?.unmount());
  jest.restoreAllMocks();
});

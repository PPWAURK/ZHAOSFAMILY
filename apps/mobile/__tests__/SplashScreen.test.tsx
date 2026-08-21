import ReactTestRenderer from "react-test-renderer";
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

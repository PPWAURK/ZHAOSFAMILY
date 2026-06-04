import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { SplashScreen } from "../src/features/splash/SplashScreen";

test("renders the reduced-motion splash without native artwork dependencies", async () => {
  jest.useFakeTimers();

  const renderers: ReactTestRenderer.ReactTestRenderer[] = [];
  const onFinish = jest.fn();

  await ReactTestRenderer.act(() => {
    renderers.push(ReactTestRenderer.create(<SplashScreen onFinish={onFinish} reduceMotionOverride />));
  });

  await ReactTestRenderer.act(() => {
    jest.advanceTimersByTime(1_000);
  });

  expect(onFinish).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(() => {
    renderers[0]?.unmount();
  });

  jest.useRealTimers();
});

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import * as ScreenCapture from "expo-screen-capture";
import { ProtectedScreen } from "../src/components/ProtectedScreen";

test("starts screen protection when enabled", async () => {
  const preventScreenCapture = jest
    .spyOn(ScreenCapture, "preventScreenCaptureAsync")
    .mockResolvedValue(undefined);
  jest
    .spyOn(ScreenCapture, "enableAppSwitcherProtectionAsync")
    .mockResolvedValue(undefined);

  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ProtectedScreen enabled screenName="test-screen">
        <React.Fragment>Protected content</React.Fragment>
      </ProtectedScreen>,
    );
    await Promise.resolve();
  });

  expect(preventScreenCapture).toHaveBeenCalledWith(
    "zhao-protected-screen-content",
  );
  ReactTestRenderer.act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

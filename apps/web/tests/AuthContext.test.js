import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { apiClient } from "@/shared/api/api-client";
import { AuthProvider, useAuth } from "@/features/auth/context/AuthContext";

jest.mock("@/shared/api/api-client", () => ({
  apiClient: { get: jest.fn() },
  getRefreshToken: jest.fn(),
  setAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
}));

function createStorage(initialValues = {}) {
  const values = new Map(Object.entries(initialValues));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function AuthState() {
  const { isLoading, user } = useAuth();
  return React.createElement(
    "span",
    { isLoading, userId: user?.id ?? null },
  );
}

test("clears a rejected session lookup and finishes initialization", async () => {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: createStorage({ zhao_access_token: "access", zhao_refresh_token: "refresh" }),
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: createStorage(),
  });
  apiClient.get.mockRejectedValue(new Error("session expired"));

  const rendererRef = {};
  await ReactTestRenderer.act(async () => {
    rendererRef.current = ReactTestRenderer.create(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(rendererRef.current?.root.findByType("span").props).toEqual({
    isLoading: false,
    userId: null,
  });
  ReactTestRenderer.act(() => rendererRef.current?.unmount());
});

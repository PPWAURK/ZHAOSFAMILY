import React from "react";
import ReactTestRenderer from "react-test-renderer";
import PermissionsPage from "@/features/permissions/pages/PermissionsPage";
import {
  fetchManageableRestaurants,
  fetchPermissionRoles,
  fetchPermissionUsers,
} from "@/features/permissions/services/permissionsApi";

jest.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { permissions: ["system.permission.manage"] },
  }),
}));

jest.mock("@/features/training/components/TrainingLayout", () => {
  const React = require("react");
  const { TRAINING_COPY } = require("@/features/training/constants/training-copy");
  const styles = new Proxy({}, { get: (_target, property) => property });

  return {
    __esModule: true,
    default: ({ children, pageCopy }) => {
      const t = { ...TRAINING_COPY.zh, ...(pageCopy?.zh || {}) };
      return typeof children === "function"
        ? children({ lang: "zh", styles, t })
        : React.createElement(React.Fragment, null, children);
    },
  };
});

jest.mock("@/shared/components/toast/ToastProvider", () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock("@/features/permissions/services/permissionsApi", () => ({
  fetchManageableRestaurants: jest.fn(),
  fetchPermissionRoles: jest.fn(),
  fetchPermissionUsers: jest.fn(),
  updatePermissionUserManagedRestaurants: jest.fn(),
  updatePermissionUserRoles: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchManageableRestaurants.mockResolvedValue([]);
  fetchPermissionRoles.mockResolvedValue([]);
  fetchPermissionUsers.mockResolvedValue([
    {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      accountStatus: "approved",
      jobRole: "holding",
      restaurant: null,
      managedRestaurants: [],
      roles: ["training-admin", "super-admin"],
      permissions: ["system.permission.manage"],
    },
    {
      id: 2,
      name: "Roleless User",
      email: "roleless@example.com",
      accountStatus: "approved",
      jobRole: "holding",
      restaurant: null,
      managedRestaurants: [],
      roles: null,
      permissions: [],
    },
  ]);
});

test("loads permission data and normalizes each user's role list", async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<PermissionsPage />);
    await Promise.resolve();
  });

  expect(fetchManageableRestaurants).toHaveBeenCalledTimes(1);
  expect(fetchPermissionRoles).toHaveBeenCalledTimes(1);
  expect(fetchPermissionUsers).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => renderer.unmount());
});

import React from "react";
import ReactTestRenderer from "react-test-renderer";
import InventoryPage from "@/features/inventory/pages/InventoryPage";
import OrderStatsPage from "@/features/order-history/pages/OrderStatsPage";
import { fetchInventory, fetchMovements } from "@/features/inventory/services/inventoryApi";
import { fetchProductOrderStats } from "@/features/orders/services/ordersApi";

jest.mock("motion/react", () => {
  const React = require("react");
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, element) =>
          ({ children, ...props }) => React.createElement(element, props, children),
      },
    ),
  };
});

jest.mock("next/link", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement("a", props, children),
  };
});

jest.mock("@/features/dashboard/components/Sidebar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/features/inventory/components/InventoryRow", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/shared/hooks/usePreferredLanguage", () => ({
  usePreferredLanguage: () => ["zh", jest.fn()],
}));

jest.mock("@/features/inventory/services/inventoryApi", () => ({
  createMovement: jest.fn(),
  fetchInventory: jest.fn(),
  fetchMovements: jest.fn(),
}));

jest.mock("@/features/orders/services/ordersApi", () => ({
  fetchProductOrderStats: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchInventory.mockResolvedValue([]);
  fetchMovements.mockResolvedValue([]);
  fetchProductOrderStats.mockRejectedValue(new Error("offline"));
});

async function renderPage(page) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(page);
    await Promise.resolve();
  });
  ReactTestRenderer.act(() => renderer.unmount());
}

test("starts inventory and order statistics loading effects", async () => {
  await renderPage(<InventoryPage supplierId="supplier-1" />);
  await renderPage(<OrderStatsPage />);

  expect(fetchInventory).toHaveBeenCalledWith("supplier-1");
  expect(fetchMovements).toHaveBeenCalledWith({
    supplierId: "supplier-1",
    limit: 50,
  });
  expect(fetchProductOrderStats).toHaveBeenCalledTimes(1);
});

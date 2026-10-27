import React from "react";
import ReactTestRenderer from "react-test-renderer";
import OrderHistoryPage from "@/features/order-history/pages/OrderHistoryPage";
import {
  createPurchaseReturn,
  fetchOrderReturnDraft,
  fetchPurchaseOrders,
  fetchPurchaseReturns,
} from "@/features/orders/services/ordersApi";

jest.mock("motion/react", () => {
  const React = require("react");
  return {
    motion: {
      section: ({ children, ...props }) => React.createElement("section", props, children),
    },
  };
});

jest.mock("@/features/dashboard/components/Sidebar", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/features/order-history/components/OrderRow", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ order, onCreateReturn }) =>
      React.createElement(
        "button",
        { onClick: () => onCreateReturn(order) },
        "Open return",
      ),
  };
});

jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));

jest.mock("@/shared/components/toast/ToastProvider", () => ({
  useToast: () => ({ success: jest.fn(), error: jest.fn() }),
}));

jest.mock("@/shared/hooks/usePreferredLanguage", () => ({
  usePreferredLanguage: () => ["zh", jest.fn()],
}));

jest.mock("@/features/orders/services/ordersApi", () => ({
  createPurchaseReturn: jest.fn(),
  deletePurchaseOrder: jest.fn(),
  fetchOrderReturnDraft: jest.fn(),
  fetchPurchaseOrderPdf: jest.fn(),
  fetchPurchaseOrders: jest.fn(),
  fetchPurchaseReturns: jest.fn(),
}));

const order = {
  id: 42,
  number: "PO-42",
  deliveryDate: "2026-10-20",
  restaurantId: 1,
  restaurantName: "Paris",
  supplierId: 9,
  supplierName: "Supplier",
  totalItems: 1,
  totalAmount: 12,
  canReturn: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchPurchaseOrders.mockResolvedValue([order]);
  fetchPurchaseReturns.mockResolvedValue([]);
  fetchOrderReturnDraft.mockResolvedValue({
    orderId: 42,
    items: [
      {
        purchaseOrderItemId: 7,
        nameZh: "Riz",
        nameFr: "Riz",
        specification: "5 kg",
        unit: "sac",
        remainingQuantity: 3,
      },
    ],
  });
  createPurchaseReturn.mockResolvedValue(undefined);
});

test("submits a return using the saved draft order id", async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<OrderHistoryPage />);
    await Promise.resolve();
  });

  const openReturnButton = renderer.root.findByProps({ children: "Open return" });
  await ReactTestRenderer.act(async () => {
    await openReturnButton.props.onClick();
  });

  const dialog = renderer.root.findByProps({ role: "dialog" });
  const reasonInput = dialog.findAllByType("input").find((input) => input.props.type !== "number");
  const quantityInput = dialog.findByProps({ type: "number" });

  await ReactTestRenderer.act(async () => {
    reasonInput.props.onChange({ target: { value: "Damaged" } });
    quantityInput.props.onChange({ target: { value: "1" } });
  });

  const submitButton = dialog
    .findAllByType("button")
    .find((button) => button.props.children === "提交退货");
  await ReactTestRenderer.act(async () => {
    await submitButton.props.onClick();
  });

  expect(createPurchaseReturn).toHaveBeenCalledWith(
    expect.objectContaining({ orderId: 42, reason: "Damaged" }),
  );
  ReactTestRenderer.act(() => renderer.unmount());
});

test("ignores a second return submission while the first is pending", async () => {
  let resolveReturn;
  createPurchaseReturn.mockReturnValue(
    new Promise((resolve) => {
      resolveReturn = resolve;
    }),
  );

  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<OrderHistoryPage />);
    await Promise.resolve();
  });

  await ReactTestRenderer.act(async () => {
    await renderer.root.findByProps({ children: "Open return" }).props.onClick();
  });

  const dialog = renderer.root.findByProps({ role: "dialog" });
  const reasonInput = dialog.findAllByType("input").find((input) => input.props.type !== "number");
  const quantityInput = dialog.findByProps({ type: "number" });
  await ReactTestRenderer.act(async () => {
    reasonInput.props.onChange({ target: { value: "Damaged" } });
    quantityInput.props.onChange({ target: { value: "1" } });
  });

  const submitButton = dialog
    .findAllByType("button")
    .find((button) => button.props.children === "提交退货");
  ReactTestRenderer.act(() => {
    submitButton.props.onClick();
  });
  ReactTestRenderer.act(() => {
    submitButton.props.onClick();
  });

  expect(createPurchaseReturn).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    resolveReturn();
    await Promise.resolve();
  });
  ReactTestRenderer.act(() => renderer.unmount());
});

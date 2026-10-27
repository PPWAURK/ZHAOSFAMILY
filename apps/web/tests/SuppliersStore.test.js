import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { useSupplierDetail, useSuppliersList } from "@/features/suppliers/store/suppliersStore";
import {
  fetchProductsBySupplier,
  fetchSupplier,
  fetchSuppliers,
} from "@/features/suppliers/services/suppliersApi";

jest.mock("@/features/suppliers/services/suppliersApi", () => ({
  createProductApi: jest.fn(),
  createSupplierApi: jest.fn(),
  deleteProductApi: jest.fn(),
  deleteSupplierApi: jest.fn(),
  fetchProductsBySupplier: jest.fn(),
  fetchSupplier: jest.fn(),
  fetchSuppliers: jest.fn(),
  reorderProductsApi: jest.fn(),
  updateProductApi: jest.fn(),
  updateSupplierApi: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchProductsBySupplier.mockResolvedValue([]);
  fetchSupplier.mockResolvedValue({ id: "supplier-7", name: "Supplier" });
  fetchSuppliers.mockResolvedValue([]);
});

test("loads the supplier list on mount", async () => {
  function SupplierListHarness() {
    return React.createElement("hook-result", useSuppliersList());
  }

  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SupplierListHarness />);
    await Promise.resolve();
  });

  expect(fetchSuppliers).toHaveBeenCalledTimes(1);
  ReactTestRenderer.act(() => renderer.unmount());
});

test("loads supplier details on mount", async () => {
  function SupplierDetailHarness() {
    return React.createElement("hook-result", useSupplierDetail("supplier-7"));
  }

  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SupplierDetailHarness />);
    await Promise.resolve();
  });

  expect(fetchSupplier).toHaveBeenCalledWith("supplier-7");
  expect(fetchProductsBySupplier).toHaveBeenCalledWith("supplier-7");
  ReactTestRenderer.act(() => renderer.unmount());
});

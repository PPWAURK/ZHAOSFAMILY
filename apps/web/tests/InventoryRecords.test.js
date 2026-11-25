import React from "react";
import ReactTestRenderer from "react-test-renderer";

import MonthlyRecordsPanel from "@/features/inventory/components/MonthlyRecordsPanel";
import MovementEntryForm from "@/features/inventory/components/MovementEntryForm";
import {
  INVENTORY_ENTRY_COPY,
  INVENTORY_RECORDS_COPY,
} from "@/features/inventory/constants/inventory-records-copy";
import { fetchRecords } from "@/features/inventory/services/inventoryApi";
import {
  buildInventoryCsvFileName,
  buildInventoryRecordsCsv,
  countRecordsByType,
  getParisMonth,
  getParisToday,
  toParisDate,
} from "@/features/inventory/utils/inventoryRecords";

jest.mock("@/features/inventory/services/inventoryApi", () => ({
  fetchRecords: jest.fn(),
}));

const { act } = ReactTestRenderer;
const SUPPLIER_NAMES = { 8: "ZHAO Bureau", 6: "Emballage" };

function record(overrides) {
  return {
    id: "mv-1",
    type: "in",
    date: "2026-11-02T12:00:00.000Z",
    supplierId: 8,
    productId: "5",
    productReference: "B-01",
    productNameCn: "纸袋",
    productDesignationFr: "Sac papier",
    specification: "50 pcs",
    unit: "carton",
    quantity: 20,
    restaurantId: null,
    restaurantName: null,
    orderNumber: null,
    deliveryDate: null,
    unitPriceHt: null,
    lineTotal: null,
    handlerName: "Bureau Admin",
    note: "Livraison fournisseur",
    ...overrides,
  };
}

const STORE_ORDER = record({
  id: "po-7",
  type: "store_order",
  date: "2026-10-31T23:30:00.000Z",
  quantity: 6,
  restaurantId: 3,
  restaurantName: "ZHAO Opéra",
  orderNumber: "PO-2026-0001",
  deliveryDate: "2026-11-03",
  unitPriceHt: "1.50",
  lineTotal: "9.00",
  handlerName: "Chef",
  note: null,
});

describe("inventory record utils", () => {
  test("builds an Excel-safe CSV with a type column and every record kind", () => {
    const csv = buildInventoryRecordsCsv(
      [record(), record({ id: "mv-2", type: "out", quantity: 4 }), STORE_ORDER],
      INVENTORY_RECORDS_COPY.zh,
      SUPPLIER_NAMES,
    );

    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('"记录类型","日期","供应商","门店"');
    expect(lines[1]).toContain('"入库","2026-11-02","ZHAO Bureau"');
    expect(lines[2]).toContain('"出库"');
    // 23:30 UTC on Oct 31 is already Nov 1 in Paris.
    expect(lines[3]).toContain('"门店订购","2026-11-01","ZHAO Bureau","ZHAO Opéra"');
    expect(lines[3]).toContain('"PO-2026-0001","2026-11-03"');
  });

  test("counts records per type and builds safe file names", () => {
    expect(countRecordsByType([record(), STORE_ORDER, STORE_ORDER])).toEqual({
      in: 1,
      out: 0,
      store_order: 2,
    });
    expect(buildInventoryCsvFileName("2026-11")).toBe("zhao-bureau-records-2026-11.csv");
    expect(buildInventoryCsvFileName("2026-11", "ZHAO / Opéra")).toBe(
      "zhao-bureau-records-2026-11-ZHAO_Opéra.csv",
    );
  });

  test("resolves dates in Paris time", () => {
    const lateUtc = new Date("2026-11-30T23:30:00.000Z");
    expect(getParisToday(lateUtc)).toBe("2026-12-01");
    expect(getParisMonth(lateUtc)).toBe("2026-12");
    expect(toParisDate("not-a-date")).toBe("not-a-date");
  });
});

function findByText(root, type, text) {
  return root.find((node) => node.type === type && node.children.join("") === text);
}

describe("MovementEntryForm", () => {
  const lines = [
    { id: "5", supplierId: 8, reference: "B-01", nameCn: "纸袋", designationFr: "", stock: 12 },
  ];
  const stores = [{ id: "3", name: "ZHAO Opéra" }];

  function render(onSubmit) {
    let renderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <MovementEntryForm
          copy={INVENTORY_ENTRY_COPY.zh}
          lines={lines}
          stores={stores}
          supplierNames={SUPPLIER_NAMES}
          onSubmit={onSubmit}
        />,
      );
    });
    return renderer.root;
  }

  async function submit(root) {
    await act(async () => {
      await root.findByType("form").props.onSubmit({ preventDefault() {} });
    });
  }

  test("submits an outbound movement with date, store and note", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const root = render(onSubmit);

    act(() => findByText(root, "button", "出库").props.onClick());
    const [productSelect, storeSelect] = root.findAllByType("select");
    const [dateInput, qtyInput, noteInput] = root.findAllByType("input");
    act(() => {
      productSelect.props.onChange({ target: { value: "5" } });
      storeSelect.props.onChange({ target: { value: "3" } });
      dateInput.props.onChange({ target: { value: "2026-11-03" } });
      qtyInput.props.onChange({ target: { value: "4" } });
      noteInput.props.onChange({ target: { value: " 调拨 " } });
    });

    await submit(root);

    expect(onSubmit).toHaveBeenCalledWith({
      productId: "5",
      delta: -4,
      reason: "调拨",
      source: "manual",
      occurredOn: "2026-11-03",
      restaurantId: "3",
    });
    expect(findByText(root, "span", "已保存")).toBeDefined();
  });

  test("blocks submission without a valid quantity", async () => {
    const onSubmit = jest.fn();
    const root = render(onSubmit);
    act(() => root.findAllByType("select")[0].props.onChange({ target: { value: "5" } }));

    await submit(root);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(findByText(root, "span", "数量必须为正整数")).toBeDefined();
  });
});

describe("MonthlyRecordsPanel", () => {
  test("loads the month's records and filters by store", async () => {
    fetchRecords.mockResolvedValue({ month: "2026-11", records: [record(), STORE_ORDER] });
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MonthlyRecordsPanel
          copy={INVENTORY_RECORDS_COPY.zh}
          supplierIds={[8, 6]}
          supplierNames={SUPPLIER_NAMES}
          stores={[{ id: "3", name: "ZHAO Opéra" }]}
          reloadKey={0}
        />,
      );
    });
    const root = renderer.root;

    expect(fetchRecords).toHaveBeenLastCalledWith({
      month: getParisMonth(),
      supplierIds: [8, 6],
      restaurantId: "",
    });
    expect(findByText(root, "p", "入库 1 条 · 出库 0 条 · 门店订购 1 条")).toBeDefined();

    await act(async () => {
      root.findByType("input").props.onChange({ target: { value: "2026-10" } });
    });
    await act(async () => {
      root.findAllByType("select")[0].props.onChange({ target: { value: "3" } });
    });
    expect(fetchRecords).toHaveBeenLastCalledWith({
      month: "2026-10",
      supplierIds: [8, 6],
      restaurantId: "3",
    });

    act(() => renderer.unmount());
  });

  test("shows a clear message when records cannot be loaded", async () => {
    fetchRecords.mockRejectedValue(new Error("403"));
    let renderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <MonthlyRecordsPanel
          copy={INVENTORY_RECORDS_COPY.zh}
          supplierIds={[8]}
          supplierNames={SUPPLIER_NAMES}
          stores={[]}
          reloadKey={0}
        />,
      );
    });
    expect(
      findByText(renderer.root, "div", INVENTORY_RECORDS_COPY.zh.loadError),
    ).toBeDefined();
    act(() => renderer.unmount());
  });
});

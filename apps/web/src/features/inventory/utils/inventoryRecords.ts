import { buildCsv, type CsvValue } from "@/shared/utils/csv";
import type { InventoryRecordsCopy } from "@/features/inventory/constants/inventory-records-copy";
import type {
  InventoryRecord,
  InventoryRecordType,
} from "@/features/inventory/types/inventory";

const PARIS_TIME_ZONE = "Europe/Paris";

/** YYYY-MM-DD of an instant, in Paris time. */
export function toParisDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today in Paris (YYYY-MM-DD) — default value of the entry form date. */
export function getParisToday(now: Date = new Date()): string {
  return toParisDate(now.toISOString());
}

/** Current Paris month (YYYY-MM) — default month filter. */
export function getParisMonth(now: Date = new Date()): string {
  return getParisToday(now).slice(0, 7);
}

export function countRecordsByType(
  records: readonly InventoryRecord[],
): Record<InventoryRecordType, number> {
  return records.reduce(
    (acc, record) => ({ ...acc, [record.type]: acc[record.type] + 1 }),
    { in: 0, out: 0, store_order: 0 } as Record<InventoryRecordType, number>,
  );
}

function toCsvLine(
  record: InventoryRecord,
  copy: InventoryRecordsCopy,
  supplierNames: Record<number, string>,
): CsvValue[] {
  return [
    copy.types[record.type],
    toParisDate(record.date),
    supplierNames[record.supplierId] ?? `#${record.supplierId}`,
    record.restaurantName,
    record.productReference,
    record.productNameCn,
    record.productDesignationFr,
    record.specification,
    record.unit,
    record.quantity,
    record.unitPriceHt,
    record.lineTotal,
    record.orderNumber,
    record.deliveryDate,
    record.handlerName,
    record.note,
  ];
}

/** One CSV for the month: every record type in one sheet, typed by the first column. */
export function buildInventoryRecordsCsv(
  records: readonly InventoryRecord[],
  copy: InventoryRecordsCopy,
  supplierNames: Record<number, string>,
): string {
  const c = copy.columns;
  const header: CsvValue[] = [
    c.type,
    c.date,
    c.supplier,
    c.store,
    c.reference,
    c.productCn,
    c.productFr,
    c.specification,
    c.unit,
    c.quantity,
    c.unitPrice,
    c.lineTotal,
    c.orderNumber,
    c.deliveryDate,
    c.handler,
    c.note,
  ];
  return buildCsv([header, ...records.map((r) => toCsvLine(r, copy, supplierNames))]);
}

export function buildInventoryCsvFileName(month: string, storeName?: string): string {
  const storePart = storeName ? `-${storeName.replace(/[\\/:*?"<>|\s]+/g, "_")}` : "";
  return `zhao-bureau-records-${month}${storePart}.csv`;
}

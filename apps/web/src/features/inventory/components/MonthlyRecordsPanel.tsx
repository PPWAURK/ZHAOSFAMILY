"use client";

import { useEffect, useMemo, useState } from "react";

import type { StoreChoice } from "@/features/inventory/components/MovementEntryForm";
import type { InventoryRecordsCopy } from "@/features/inventory/constants/inventory-records-copy";
import { fetchRecords } from "@/features/inventory/services/inventoryApi";
import type {
  InventoryRecord,
  InventoryRecordType,
} from "@/features/inventory/types/inventory";
import {
  buildInventoryCsvFileName,
  buildInventoryRecordsCsv,
  countRecordsByType,
  getParisMonth,
  toParisDate,
} from "@/features/inventory/utils/inventoryRecords";
import { downloadCsv } from "@/shared/utils/csv";
import pageStyles from "@/features/inventory/inventory-page.module.css";
import styles from "@/features/inventory/inventory-records.module.css";

type TypeFilter = InventoryRecordType | "";

type MonthlyRecordsPanelProps = {
  copy: InventoryRecordsCopy;
  supplierIds: readonly number[];
  supplierNames: Record<number, string>;
  stores: readonly StoreChoice[];
  /** Bump to reload after a new movement is saved. */
  reloadKey: number;
};

const RECORD_TYPES: InventoryRecordType[] = ["in", "out", "store_order"];

const BADGE_CLASS: Record<InventoryRecordType, string> = {
  in: styles.badgeIn,
  out: styles.badgeOut,
  store_order: "",
};

function useMonthlyRecords(
  month: string,
  supplierIds: readonly number[],
  restaurantId: string,
  reloadKey: number,
) {
  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!month) return undefined;
    let isActive = true;
    setIsLoading(true);
    setHasError(false);
    fetchRecords({ month, supplierIds, restaurantId })
      .then((result) => {
        if (isActive) setRecords(result.records);
      })
      .catch(() => {
        if (isActive) {
          setRecords([]);
          setHasError(true);
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [month, supplierIds, restaurantId, reloadKey]);

  return { records, isLoading, hasError };
}

export default function MonthlyRecordsPanel({
  copy,
  supplierIds,
  supplierNames,
  stores,
  reloadKey,
}: MonthlyRecordsPanelProps) {
  const [month, setMonth] = useState(getParisMonth);
  const [restaurantId, setRestaurantId] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");

  const { records, isLoading, hasError } = useMonthlyRecords(
    month,
    supplierIds,
    restaurantId,
    reloadKey,
  );

  const visible = useMemo(
    () => (typeFilter ? records.filter((r) => r.type === typeFilter) : records),
    [records, typeFilter],
  );
  const counts = useMemo(() => countRecordsByType(records), [records]);
  const storeName = stores.find((s) => s.id === restaurantId)?.name;

  function handleExport() {
    const csv = buildInventoryRecordsCsv(visible, copy, supplierNames);
    downloadCsv(buildInventoryCsvFileName(month, storeName), csv);
  }

  const c = copy.columns;

  return (
    <section className={styles.section} aria-labelledby="inventory-records-heading">
      <div className={styles.header}>
        <h2 id="inventory-records-heading" className={styles.heading}>
          {copy.heading}
        </h2>
        <p className={styles.hint}>{copy.hint}</p>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>{copy.month}</span>
          <input
            type="month"
            className={styles.control}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{copy.store}</span>
          <select
            className={styles.control}
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
          >
            <option value="">{copy.allStores}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{copy.type}</span>
          <select
            className={styles.control}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="">{copy.allTypes}</option>
            {RECORD_TYPES.map((type) => (
              <option key={type} value={type}>
                {copy.types[type]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.secondary}
          onClick={handleExport}
          disabled={isLoading || visible.length === 0}
        >
          {copy.export}
        </button>
      </div>

      {!isLoading && !hasError ? <p className={styles.summary}>{copy.summary(counts)}</p> : null}

      {isLoading ? (
        <div className={pageStyles.empty}>{copy.loading}</div>
      ) : hasError ? (
        <div className={pageStyles.empty}>{copy.loadError}</div>
      ) : visible.length === 0 ? (
        <div className={pageStyles.empty}>{copy.empty}</div>
      ) : (
        <div className={pageStyles.tableWrap}>
          <table className={pageStyles.table}>
            <thead>
              <tr>
                <th>{c.date}</th>
                <th>{c.type}</th>
                <th>{c.store}</th>
                <th>{c.productCn}</th>
                <th className={styles.num}>{c.quantity}</th>
                <th>{c.orderNumber}</th>
                <th className={styles.num}>{c.lineTotal}</th>
                <th>{c.handler}</th>
                <th>{c.note}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((record) => (
                <tr key={record.id}>
                  <td className={pageStyles.dateCell}>{toParisDate(record.date)}</td>
                  <td>
                    <span className={`${styles.badge} ${BADGE_CLASS[record.type]}`}>
                      {copy.types[record.type]}
                    </span>
                  </td>
                  <td>{record.restaurantName || "—"}</td>
                  <td className={pageStyles.cellProduct}>
                    {record.productNameCn || "—"}
                    {record.productDesignationFr ? (
                      <span className={pageStyles.cellProductSub}>
                        {record.productDesignationFr}
                      </span>
                    ) : null}
                  </td>
                  <td className={styles.num}>{record.quantity}</td>
                  <td>{record.orderNumber || "—"}</td>
                  <td className={styles.num}>{record.lineTotal ?? "—"}</td>
                  <td>{record.handlerName || "—"}</td>
                  <td>{record.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

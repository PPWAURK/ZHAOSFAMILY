"use client";

import { useState } from "react";

import styles from "@/features/inventory/inventory-page.module.css";

export default function InventoryRow({ line, copy, onApply, submitting }) {
  const [mode, setMode] = useState(null); // "in" | "out" | null
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function start(kind) {
    setMode(kind);
    setQty("");
    setNote("");
    setError("");
  }

  function cancel() {
    setMode(null);
    setQty("");
    setNote("");
    setError("");
  }

  async function apply() {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) {
      setError(copy.validation.qtyInvalid);
      return;
    }
    const delta = mode === "in" ? n : -n;
    setError("");
    try {
      await onApply({ delta, reason: note });
      cancel();
    } catch (err) {
      setError(err?.message || copy.saveError);
    }
  }

  const stockClass = `${styles.cellStock} ${
    line.stock === 0
      ? styles.cellStockZero
      : line.stock < 0
        ? styles.cellStockNeg
        : ""
  }`;

  return (
    <>
      <tr>
        <td className={styles.cellRef}>{line.reference || "—"}</td>
        <td className={styles.cellProduct}>
          {line.nameCn || "—"}
          {line.designationFr ? (
            <span className={styles.cellProductSub}>{line.designationFr}</span>
          ) : null}
        </td>
        <td className={styles.cellUnit}>
          {line.unit || "—"}
          {line.specification ? ` · ${line.specification}` : ""}
        </td>
        <td className={stockClass}>{line.stock}</td>
        <td>
          <div className={styles.cellActions}>
            {mode === null ? (
              <>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnIn}`}
                  onClick={() => start("in")}
                  disabled={submitting}
                >
                  {copy.addIn}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnOut}`}
                  onClick={() => start("out")}
                  disabled={submitting}
                >
                  {copy.addOut}
                </button>
              </>
            ) : (
              <div className={styles.inlineForm}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={styles.qtyInput}
                  placeholder={copy.qtyPlaceholder}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  autoFocus
                  disabled={submitting}
                />
                <input
                  type="text"
                  className={styles.noteInput}
                  placeholder={copy.notePlaceholder}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={apply}
                  disabled={submitting}
                >
                  {submitting ? copy.saving : copy.apply}
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={cancel}
                  disabled={submitting}
                >
                  {copy.cancel}
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      {error ? (
        <tr>
          <td colSpan={5} className={styles.rowError}>
            {error}
          </td>
        </tr>
      ) : null}
    </>
  );
}

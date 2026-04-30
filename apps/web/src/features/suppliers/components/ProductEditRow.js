"use client";

import { useEffect, useState } from "react";

import styles from "@/features/suppliers/suppliers-page.module.css";

function toInputValue(product) {
  return {
    reference: product.reference || "",
    category: product.category || "",
    nameCn: product.nameCn || "",
    designationFr: product.designationFr || "",
    unit: product.unit || "",
    price: product.price == null ? "" : String(product.price),
    specification: product.specification || "",
    image: product.image || "",
  };
}

export default function ProductEditRow({
  product,
  editing,
  submitting,
  copy,
  onStartEdit,
  onCancelEdit,
  onSave,
  onRequestDelete,
}) {
  const [draft, setDraft] = useState(() => toInputValue(product));
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setDraft(toInputValue(product));
      setError("");
    }
  }, [editing, product]);

  function patch(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError("");
    if (!draft.category.trim()) {
      setError(copy.validation.categoryRequired);
      return;
    }
    if (!draft.nameCn.trim()) {
      setError(copy.validation.nameCnRequired);
      return;
    }
    const priceValue = draft.price === "" ? 0 : Number(draft.price);
    if (!Number.isFinite(priceValue)) {
      setError(copy.validation.priceInvalid);
      return;
    }
    onSave({ ...draft, price: priceValue });
  }

  if (editing) {
    return (
      <tr>
        <td>
          <input
            className={`${styles.tableInput} ${styles.tableInputMono}`}
            value={draft.reference}
            onChange={(e) => patch("reference", e.target.value)}
            placeholder={copy.referencePlaceholder}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.category}
            onChange={(e) => patch("category", e.target.value)}
            placeholder={copy.categoryPlaceholder}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.nameCn}
            onChange={(e) => patch("nameCn", e.target.value)}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.designationFr}
            onChange={(e) => patch("designationFr", e.target.value)}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.unit}
            onChange={(e) => patch("unit", e.target.value)}
            placeholder={copy.unitPlaceholder}
          />
        </td>
        <td>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`${styles.tableInput} ${styles.tableInputMono} ${styles.tableInputNarrow}`}
            value={draft.price}
            onChange={(e) => patch("price", e.target.value)}
            placeholder={copy.pricePlaceholder}
          />
        </td>
        <td>
          <input
            className={styles.tableInput}
            value={draft.specification}
            onChange={(e) => patch("specification", e.target.value)}
          />
        </td>
        <td>
          <input
            className={`${styles.tableInput} ${styles.tableInputMono}`}
            value={draft.image}
            onChange={(e) => patch("image", e.target.value)}
            placeholder={copy.imagePlaceholder}
          />
        </td>
        <td>
          <div className={styles.rowActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
              onClick={save}
              disabled={submitting}
            >
              {submitting ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
              onClick={onCancelEdit}
              disabled={submitting}
            >
              {copy.cancel}
            </button>
          </div>
          {error ? (
            <div className={styles.formError} style={{ marginTop: 6 }}>
              {error}
            </div>
          ) : null}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
        {product.reference || "—"}
      </td>
      <td>{product.category || "—"}</td>
      <td>{product.nameCn || "—"}</td>
      <td>{product.designationFr || "—"}</td>
      <td>{product.unit || "—"}</td>
      <td
        style={{
          fontFamily: "var(--mono)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {copy.currencySymbol}
        {Number(product.price || 0).toFixed(2)}
      </td>
      <td>{product.specification || "—"}</td>
      <td
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--ink-40)",
          maxWidth: 220,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={product.image}
      >
        {product.image || "—"}
      </td>
      <td>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
            onClick={onStartEdit}
          >
            {copy.edit}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
            onClick={onRequestDelete}
          >
            {copy.deleteBtn}
          </button>
        </div>
      </td>
    </tr>
  );
}

"use client";

import { useState } from "react";

import styles from "@/features/suppliers/suppliers-page.module.css";

function toInitial(initial) {
  return {
    name: initial?.name || "",
    sortOrder:
      initial && Number.isFinite(initial.sortOrder)
        ? String(initial.sortOrder)
        : "",
    includeAllProductsInOrder: !!initial?.includeAllProductsInOrder,
  };
}

export default function SupplierForm({
  initial,
  copy,
  submitting,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(() => toInitial(initial));
  const [error, setError] = useState("");

  function patch(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError(copy.validation.nameRequired);
      return;
    }
    const sort = form.sortOrder === "" ? undefined : Number(form.sortOrder);
    try {
      await onSubmit({
        name: form.name.trim(),
        sortOrder: Number.isFinite(sort) ? sort : undefined,
        includeAllProductsInOrder: form.includeAllProductsInOrder,
      });
    } catch (err) {
      setError(err?.message || copy.saveError);
    }
  }

  return (
    <form className={styles.panel} onSubmit={submit}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          {initial?.id ? copy.editing : copy.newSupplierTitle}
        </h3>
      </div>

      <div className={styles.formGrid}>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>{copy.fieldName} *</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => patch("name", e.target.value)}
            placeholder={copy.namePlaceholder}
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{copy.fieldSortOrder}</label>
          <input
            type="number"
            className={styles.input}
            value={form.sortOrder}
            onChange={(e) => patch("sortOrder", e.target.value)}
            min="0"
            disabled={submitting}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={!!form.includeAllProductsInOrder}
              onChange={(e) =>
                patch("includeAllProductsInOrder", e.target.checked)
              }
              disabled={submitting}
            />
            {copy.fieldIncludeAll}
          </label>
        </div>
      </div>

      {error ? <span className={styles.formError}>{error}</span> : null}

      <div className={styles.formActions}>
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={submitting}
        >
          {submitting ? copy.saving : copy.save}
        </button>
        {onCancel ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onCancel}
            disabled={submitting}
          >
            {copy.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}

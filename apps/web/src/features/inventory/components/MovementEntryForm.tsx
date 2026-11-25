"use client";

import { useState, type FormEvent } from "react";

import type { InventoryEntryCopy } from "@/features/inventory/constants/inventory-records-copy";
import type {
  CreateInventoryMovementInput,
  InventoryLine,
} from "@/features/inventory/types/inventory";
import { getParisToday } from "@/features/inventory/utils/inventoryRecords";
import styles from "@/features/inventory/inventory-records.module.css";

type MovementKind = "in" | "out";

export type StoreChoice = { id: string; name: string };

type MovementEntryFormProps = {
  copy: InventoryEntryCopy;
  lines: readonly InventoryLine[];
  stores: readonly StoreChoice[];
  supplierNames: Record<number, string>;
  onSubmit: (input: CreateInventoryMovementInput) => Promise<unknown>;
};

type FormState = {
  kind: MovementKind;
  productId: string;
  occurredOn: string;
  quantity: string;
  restaurantId: string;
  note: string;
};

function createInitialState(): FormState {
  return {
    kind: "in",
    productId: "",
    occurredOn: getParisToday(),
    quantity: "",
    restaurantId: "",
    note: "",
  };
}

function validate(state: FormState, copy: InventoryEntryCopy): string {
  if (!state.productId) return copy.errors.productRequired;
  if (!state.occurredOn) return copy.errors.dateRequired;
  const qty = Number(state.quantity);
  if (!Number.isInteger(qty) || qty <= 0) return copy.errors.qtyInvalid;
  return "";
}

function toMovementInput(state: FormState): CreateInventoryMovementInput {
  const qty = Number(state.quantity);
  return {
    productId: state.productId,
    delta: state.kind === "in" ? qty : -qty,
    reason: state.note.trim(),
    source: "manual",
    occurredOn: state.occurredOn,
    restaurantId: state.kind === "out" && state.restaurantId ? state.restaurantId : undefined,
  };
}

function groupLinesBySupplier(lines: readonly InventoryLine[]): [number, InventoryLine[]][] {
  const groups = new Map<number, InventoryLine[]>();
  for (const line of lines) {
    groups.set(line.supplierId, [...(groups.get(line.supplierId) ?? []), line]);
  }
  return [...groups.entries()];
}

function productLabel(line: InventoryLine): string {
  const name = [line.nameCn, line.designationFr].filter(Boolean).join(" · ");
  const ref = line.reference ? `[${line.reference}] ` : "";
  return `${ref}${name} (${line.stock})`;
}

export default function MovementEntryForm({
  copy,
  lines,
  stores,
  supplierNames,
  onSubmit,
}: MovementEntryFormProps) {
  const [state, setState] = useState<FormState>(createInitialState);
  const [error, setError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = validate(state, copy);
    setError(message);
    if (message) return;

    setIsSubmitting(true);
    try {
      await onSubmit(toMovementInput(state));
      // Keep kind/date/store for fast consecutive entries; clear the line details.
      setState((prev) => ({ ...prev, productId: "", quantity: "", note: "" }));
      setIsSaved(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : copy.errors.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = getParisToday();
  const groups = groupLinesBySupplier(lines);

  return (
    <section className={styles.section} aria-labelledby="inventory-entry-heading">
      <div className={styles.header}>
        <h2 id="inventory-entry-heading" className={styles.heading}>
          {copy.heading}
        </h2>
        <p className={styles.hint}>{copy.hint}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <span className={styles.label}>{copy.typeLabel}</span>
            <div className={styles.typeToggle} role="group" aria-label={copy.typeLabel}>
              {(["in", "out"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={state.kind === kind}
                  className={`${styles.typeOption} ${
                    state.kind === kind
                      ? kind === "in"
                        ? styles.typeOptionIn
                        : styles.typeOptionOut
                      : ""
                  }`}
                  onClick={() => update("kind", kind)}
                >
                  {kind === "in" ? copy.typeIn : copy.typeOut}
                </button>
              ))}
            </div>
          </div>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>{copy.product}</span>
            <select
              className={styles.control}
              value={state.productId}
              onChange={(e) => update("productId", e.target.value)}
            >
              <option value="">{copy.productPlaceholder}</option>
              {groups.map(([supplierId, supplierLines]) => (
                <optgroup key={supplierId} label={supplierNames[supplierId] ?? `#${supplierId}`}>
                  {supplierLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {productLabel(line)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.date}</span>
            <input
              type="date"
              className={styles.control}
              value={state.occurredOn}
              max={today}
              onChange={(e) => update("occurredOn", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.quantity}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className={styles.control}
              value={state.quantity}
              onChange={(e) => update("quantity", e.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{copy.store}</span>
            <select
              className={styles.control}
              value={state.kind === "out" ? state.restaurantId : ""}
              disabled={state.kind !== "out"}
              onChange={(e) => update("restaurantId", e.target.value)}
            >
              <option value="">{copy.storeNone}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>{copy.note}</span>
            <input
              type="text"
              maxLength={255}
              className={styles.control}
              placeholder={copy.notePlaceholder}
              value={state.note}
              onChange={(e) => update("note", e.target.value)}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.label}>{copy.handler}</span>
            <span className={styles.staticValue}>{copy.handlerValue}</span>
          </div>
        </div>

        <div className={styles.formFooter}>
          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? copy.submitting : copy.submit}
          </button>
          {error ? (
            <span className={styles.error} role="alert">
              {error}
            </span>
          ) : null}
          {isSaved && !error ? (
            <span className={styles.success} role="status">
              {copy.saved}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}

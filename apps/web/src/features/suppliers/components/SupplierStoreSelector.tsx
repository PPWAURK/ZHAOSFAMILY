"use client";

import { useMemo, useState } from "react";

import { formatStoreCode } from "@/features/stores/services/restaurantsApi";
import type { RestaurantApiRecord } from "@/features/stores/types/store";
import styles from "@/features/suppliers/components/supplier-availability-panel.module.css";
import baseStyles from "@/features/suppliers/suppliers-page.module.css";

type SupplierStoreSelectorCopy = {
  availabilitySearch: string;
  availabilitySelectedCount: string;
  availabilitySelectVisible: string;
  availabilityClear: string;
  availabilityNoStores: string;
  availabilityNoMatches: string;
};

type SupplierStoreSelectorProps = {
  stores: RestaurantApiRecord[];
  selectedRestaurantIds: Set<number>;
  disabled: boolean;
  copy: SupplierStoreSelectorCopy;
  onChange: (restaurantIds: Set<number>) => void;
};

function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export default function SupplierStoreSelector({
  stores,
  selectedRestaurantIds,
  disabled,
  copy,
  onChange,
}: SupplierStoreSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredStores = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return stores;

    return stores.filter((store) =>
      [store.name, store.storeCode, store.address]
        .map(normalizeSearchText)
        .some((value) => value.includes(query)),
    );
  }, [search, stores]);

  function toggleStore(restaurantId: number): void {
    const nextIds = new Set(selectedRestaurantIds);
    if (nextIds.has(restaurantId)) {
      nextIds.delete(restaurantId);
    } else {
      nextIds.add(restaurantId);
    }
    onChange(nextIds);
  }

  function selectVisibleStores(): void {
    const nextIds = new Set(selectedRestaurantIds);
    filteredStores.forEach((store) => nextIds.add(Number(store.id)));
    onChange(nextIds);
  }

  return (
    <div className={styles.storePicker}>
      <div className={styles.pickerToolbar}>
        <input
          className={baseStyles.input}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.availabilitySearch}
          aria-label={copy.availabilitySearch}
          disabled={disabled}
        />
        <span className={styles.selectedCount}>
          {copy.availabilitySelectedCount.replace("{count}", String(selectedRestaurantIds.size))}
        </span>
      </div>
      <div className={styles.pickerActions}>
        <button
          type="button"
          className={`${baseStyles.btn} ${baseStyles.btnGhost} ${baseStyles.btnSmall}`}
          onClick={selectVisibleStores}
          disabled={filteredStores.length === 0 || disabled}
        >
          {copy.availabilitySelectVisible}
        </button>
        <button
          type="button"
          className={`${baseStyles.btn} ${baseStyles.btnGhost} ${baseStyles.btnSmall}`}
          onClick={() => onChange(new Set())}
          disabled={selectedRestaurantIds.size === 0 || disabled}
        >
          {copy.availabilityClear}
        </button>
      </div>

      {stores.length === 0 ? (
        <p className={styles.stateText}>{copy.availabilityNoStores}</p>
      ) : filteredStores.length === 0 ? (
        <p className={styles.stateText}>{copy.availabilityNoMatches}</p>
      ) : (
        <div className={styles.storeList}>
          {filteredStores.map((store) => {
            const restaurantId = Number(store.id);
            return (
              <label key={store.id} className={styles.storeRow}>
                <input
                  type="checkbox"
                  checked={selectedRestaurantIds.has(restaurantId)}
                  onChange={() => toggleStore(restaurantId)}
                  disabled={disabled}
                />
                <span className={styles.storeIdentity}>
                  <strong>{store.name || "—"}</strong>
                  <small>
                    {formatStoreCode(store.storeCode)} · {store.address || "—"}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

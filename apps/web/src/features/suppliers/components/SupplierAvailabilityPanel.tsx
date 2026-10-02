"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupplierAvailabilityScope } from "@zhao/types";

import { fetchRestaurants } from "@/features/stores/services/restaurantsApi";
import type { RestaurantApiRecord } from "@/features/stores/types/store";
import SupplierStoreSelector from "@/features/suppliers/components/SupplierStoreSelector";
import {
  fetchSupplierAvailability,
  updateSupplierAvailabilityApi,
} from "@/features/suppliers/services/suppliersApi";
import baseStyles from "@/features/suppliers/suppliers-page.module.css";
import styles from "@/features/suppliers/components/supplier-availability-panel.module.css";

type AvailabilityCopy = {
  availabilityHeading: string;
  availabilityHint: string;
  availabilityAll: string;
  availabilityAllHint: string;
  availabilitySelected: string;
  availabilitySelectedHint: string;
  availabilitySearch: string;
  availabilitySelectedCount: string;
  availabilitySelectVisible: string;
  availabilityClear: string;
  availabilityNoStores: string;
  availabilityNoMatches: string;
  availabilityUnsaved: string;
  availabilitySaved: string;
  availabilityLoadError: string;
  availabilitySaveError: string;
  availabilityRetry: string;
  save: string;
  saving: string;
};

type SupplierAvailabilityPanelProps = {
  supplierId: string;
  copy: AvailabilityCopy;
};

type AvailabilityDraft = {
  scope: SupplierAvailabilityScope;
  restaurantIds: Set<number>;
};

function toSortedIds(ids: Set<number>): number[] {
  return [...ids].sort((left, right) => left - right);
}

function areDraftsEqual(left: AvailabilityDraft, right: AvailabilityDraft): boolean {
  if (left.scope !== right.scope) return false;
  if (left.scope === "all") return true;

  const leftIds = toSortedIds(left.restaurantIds);
  const rightIds = toSortedIds(right.restaurantIds);
  return leftIds.length === rightIds.length && leftIds.every((id, index) => id === rightIds[index]);
}

export default function SupplierAvailabilityPanel({
  supplierId,
  copy,
}: SupplierAvailabilityPanelProps) {
  const [stores, setStores] = useState<RestaurantApiRecord[]>([]);
  const [savedDraft, setSavedDraft] = useState<AvailabilityDraft | null>(null);
  const [draft, setDraft] = useState<AvailabilityDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const [saveSucceeded, setSaveSucceeded] = useState(false);
  const loadRequestId = useRef(0);

  const loadAvailability = useCallback(async () => {
    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;
    setIsLoading(true);
    setHasLoadError(false);
    setHasSaveError(false);
    setSavedDraft(null);
    setDraft(null);
    try {
      const [availability, restaurants] = await Promise.all([
        fetchSupplierAvailability(supplierId),
        fetchRestaurants(),
      ]);
      if (requestId !== loadRequestId.current) return;
      const nextDraft = {
        scope: availability.scope,
        restaurantIds: new Set(availability.restaurantIds),
      } satisfies AvailabilityDraft;

      setStores(
        [...restaurants].sort((left, right) => Number(left.storeCode) - Number(right.storeCode)),
      );
      setSavedDraft(nextDraft);
      setDraft({ ...nextDraft, restaurantIds: new Set(nextDraft.restaurantIds) });
      setSaveSucceeded(false);
    } catch {
      if (requestId !== loadRequestId.current) return;
      setHasLoadError(true);
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoading(false);
      }
    }
  }, [supplierId]);

  useEffect(() => {
    void loadAvailability();
    return () => {
      loadRequestId.current += 1;
    };
  }, [loadAvailability]);

  const isDirty = Boolean(draft && savedDraft && !areDraftsEqual(draft, savedDraft));

  function patchScope(scope: SupplierAvailabilityScope): void {
    if (!draft) return;
    setDraft({ ...draft, scope });
    setHasSaveError(false);
    setSaveSucceeded(false);
  }

  function updateSelectedStores(restaurantIds: Set<number>): void {
    if (!draft) return;
    setDraft({ ...draft, restaurantIds });
    setHasSaveError(false);
    setSaveSucceeded(false);
  }

  async function saveAvailability(): Promise<void> {
    if (!draft || !isDirty) return;
    setIsSaving(true);
    setHasSaveError(false);
    setSaveSucceeded(false);
    try {
      const updated = await updateSupplierAvailabilityApi(supplierId, {
        scope: draft.scope,
        restaurantIds: draft.scope === "selected" ? toSortedIds(draft.restaurantIds) : [],
      });
      const nextDraft = {
        scope: updated.scope,
        restaurantIds: new Set(updated.restaurantIds),
      } satisfies AvailabilityDraft;
      setSavedDraft(nextDraft);
      setDraft({ ...nextDraft, restaurantIds: new Set(nextDraft.restaurantIds) });
      setSaveSucceeded(true);
    } catch {
      setHasSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className={baseStyles.section} aria-labelledby="supplier-availability-heading">
      <div className={baseStyles.sectionHeader}>
        <div className={baseStyles.sectionHeadingBlock}>
          <h2 id="supplier-availability-heading" className={baseStyles.sectionHeading}>
            {copy.availabilityHeading}
          </h2>
          <p className={baseStyles.sectionHint}>{copy.availabilityHint}</p>
        </div>
        <button
          type="button"
          className={`${baseStyles.btn} ${baseStyles.btnPrimary}`}
          disabled={!isDirty || isSaving || isLoading}
          onClick={() => void saveAvailability()}
        >
          {isSaving ? copy.saving : copy.save}
        </button>
      </div>

      {isLoading ? <p className={styles.stateText}>{copy.availabilityHeading}…</p> : null}
      {!isLoading && hasLoadError ? (
        <div className={styles.errorRow} role="alert">
          <span>{copy.availabilityLoadError}</span>
          <button
            type="button"
            className={`${baseStyles.btn} ${baseStyles.btnGhost} ${baseStyles.btnSmall}`}
            onClick={() => void loadAvailability()}
          >
            {copy.availabilityRetry}
          </button>
        </div>
      ) : null}

      {!isLoading && draft ? (
        <>
          <div
            className={styles.scopeGroup}
            role="radiogroup"
            aria-label={copy.availabilityHeading}
          >
            <label
              className={`${styles.scopeOption} ${draft.scope === "all" ? styles.scopeOptionActive : ""}`}
            >
              <input
                type="radio"
                name={`supplier-availability-${supplierId}`}
                checked={draft.scope === "all"}
                onChange={() => patchScope("all")}
                disabled={isSaving}
              />
              <span>
                <strong>{copy.availabilityAll}</strong>
                <small>{copy.availabilityAllHint}</small>
              </span>
            </label>
            <label
              className={`${styles.scopeOption} ${draft.scope === "selected" ? styles.scopeOptionActive : ""}`}
            >
              <input
                type="radio"
                name={`supplier-availability-${supplierId}`}
                checked={draft.scope === "selected"}
                onChange={() => patchScope("selected")}
                disabled={isSaving}
              />
              <span>
                <strong>{copy.availabilitySelected}</strong>
                <small>{copy.availabilitySelectedHint}</small>
              </span>
            </label>
          </div>

          {draft.scope === "selected" ? (
            <SupplierStoreSelector
              stores={stores}
              selectedRestaurantIds={draft.restaurantIds}
              disabled={isSaving}
              copy={copy}
              onChange={updateSelectedStores}
            />
          ) : null}

          <div className={styles.feedbackRow} aria-live="polite">
            {isDirty ? <span>{copy.availabilityUnsaved}</span> : null}
            {saveSucceeded ? (
              <span className={styles.successText}>{copy.availabilitySaved}</span>
            ) : null}
            {hasSaveError ? (
              <span className={styles.errorText}>{copy.availabilitySaveError}</span>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

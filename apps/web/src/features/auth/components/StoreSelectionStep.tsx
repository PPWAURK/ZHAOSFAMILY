"use client";

import { motion } from "motion/react";

import styles from "@/features/auth/auth-page.module.css";
import StoreTiltCard from "@/features/auth/components/StoreTiltCard";
import type { StoreOption } from "@/features/stores/types/store";

type StoreSelectionCopy = Record<string, string>;

type StoreSelectionStepProps = {
  t: StoreSelectionCopy;
  stores: StoreOption[];
  isLoadingStores: boolean;
  storesError: string;
  selectedStoreId: string;
  storeSelectionError: string;
  onBack: () => void;
  onContinue: () => void;
  onSelectStore: (storeId: string) => void;
};

export default function StoreSelectionStep({
  t,
  stores,
  isLoadingStores,
  storesError,
  selectedStoreId,
  storeSelectionError,
  onBack,
  onContinue,
  onSelectStore,
}: StoreSelectionStepProps) {
  return (
    <div className={styles.stepFlow}>
      <div className={styles.storeSectionHead}>
        <div>
          <p className={styles.sectionEyebrow}>{t.storeCollectionEyebrow}</p>
          <p className={styles.sectionHint}>{t.storeSelectionHint}</p>
        </div>
        <span className={styles.storeCount}>{isLoadingStores ? "…" : stores.length}</span>
      </div>

      {isLoadingStores ? (
        <div className={styles.storeStatePanel}>{t.storeLoading}</div>
      ) : null}

      {!isLoadingStores && storesError ? (
        <div className={styles.storeStatePanel} role="alert">
          {t.storeLoadError}
        </div>
      ) : null}

      {!isLoadingStores && !storesError && stores.length === 0 ? (
        <div className={styles.storeStatePanel}>{t.storeEmpty}</div>
      ) : null}

      {!isLoadingStores && !storesError && stores.length > 0 ? (
        <div className={styles.storeGrid} role="list" aria-label={t.storeListAriaLabel}>
          {stores.map((store, index) => (
            <motion.div
              key={store.id}
              role="listitem"
              className={styles.storeGridItem}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: index * 0.025 }}
            >
              <StoreTiltCard
                index={index}
                isSelected={selectedStoreId === store.id}
                onSelect={onSelectStore}
                pickLabel={t.storePickLabel}
                selectedLabel={t.storeSelectedLabel}
                store={store}
              />
            </motion.div>
          ))}
        </div>
      ) : null}

      {storeSelectionError ? (
        <p className={styles.formError} role="alert">
          {storeSelectionError}
        </p>
      ) : null}

      <div className={styles.dualActionRow}>
        <button type="button" className={styles.secondaryAction} onClick={onBack}>
          {t.storeBack}
        </button>
        <button
          type="button"
          className={styles.ctaPrimary}
          onClick={onContinue}
          disabled={isLoadingStores || Boolean(storesError) || stores.length === 0}
        >
          <span>{t.storeContinue}</span>
          <span className={styles.ctaArrow} aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </div>
  );
}

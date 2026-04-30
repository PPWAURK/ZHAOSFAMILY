"use client";

import styles from "@/features/orders/new-order-page.module.css";

export default function StepSupplier({
  suppliers,
  isLoading,
  loadError,
  selectedId,
  onSelect,
  copy,
}) {
  const step = copy.steps.find((item) => item.id === "supplier");

  function renderContent() {
    if (isLoading) {
      return <div className={styles.statePanel}>{copy.loadingSuppliers}</div>;
    }

    if (loadError) {
      return (
        <div className={styles.statePanel} role="alert">
          {loadError}
        </div>
      );
    }

    if (suppliers.length === 0) {
      return <div className={styles.statePanel}>{copy.emptySuppliers}</div>;
    }

    return (
      <div className={styles.choiceGrid}>
        {suppliers.map((supplier, index) => {
          const isActive = supplier.id === selectedId;
          return (
            <button
              key={supplier.id}
              type="button"
              className={`${styles.choiceCard} ${isActive ? styles.choiceCardActive : ""}`}
              onClick={() => onSelect(supplier.id)}
              aria-pressed={isActive}
            >
              <span className={styles.choiceCardIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.choiceCardTitle}>{supplier.name}</h3>
              <div className={styles.choiceCardMeta}>
                <span>
                  {copy.supplierOrderLabel} {supplier.sortOrder}
                </span>
                {supplier.includeAllProductsInOrder ? (
                  <span>{copy.supplierAllProductsLabel}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionHeading}>{step?.title}</h2>
        <p className={styles.sectionHint}>{step?.hint}</p>
      </header>

      <p className={styles.listHeading}>{copy.supplierList}</p>

      {renderContent()}
    </section>
  );
}

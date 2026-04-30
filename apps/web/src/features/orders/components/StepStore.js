"use client";

import styles from "@/features/orders/new-order-page.module.css";

export default function StepStore({
  stores,
  isLoading,
  loadError,
  selectedId,
  onSelect,
  copy,
}) {
  const step = copy.steps[0];

  function renderContent() {
    if (isLoading) {
      return <div className={styles.statePanel}>{copy.loadingStores}</div>;
    }

    if (loadError) {
      return (
        <div className={styles.statePanel} role="alert">
          {loadError}
        </div>
      );
    }

    if (stores.length === 0) {
      return <div className={styles.statePanel}>{copy.emptyStores}</div>;
    }

    return (
      <div className={styles.choiceGrid}>
        {stores.map((store, index) => {
          const isActive = store.id === selectedId;
          return (
            <button
              key={store.id}
              type="button"
              className={`${styles.choiceCard} ${isActive ? styles.choiceCardActive : ""}`}
              onClick={() => onSelect(store.id)}
              aria-pressed={isActive}
            >
              <span className={styles.choiceCardIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.choiceCardTitle}>{store.name}</h3>
              <div className={styles.choiceCardMeta}>
                <span>{store.storeCode}</span>
                <span>{store.address}</span>
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
        <h2 className={styles.sectionHeading}>{step.title}</h2>
        <p className={styles.sectionHint}>{step.hint}</p>
      </header>

      <p className={styles.listHeading}>{copy.storeList}</p>

      {renderContent()}
    </section>
  );
}

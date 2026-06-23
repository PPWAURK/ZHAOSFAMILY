"use client";

import styles from "@/shared/components/toast/toast.module.css";

export default function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.viewport} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.tone] ?? ""}`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            className={styles.close}
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

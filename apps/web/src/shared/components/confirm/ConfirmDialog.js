"use client";

import { useEffect, useRef } from "react";

import styles from "@/shared/components/confirm/confirm-dialog.module.css";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onConfirm,
  onCancel,
}) {
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      } else if (event.key === "Enter") {
        event.preventDefault();
        onConfirm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    confirmButtonRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel, onConfirm]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-label={title || message}
      >
        {title ? <h2 className={styles.title}>{title}</h2> : null}
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={`${styles.confirm} ${tone === "danger" ? styles.danger : ""}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

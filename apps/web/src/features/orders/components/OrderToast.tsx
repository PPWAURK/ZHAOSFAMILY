"use client";

import { AnimatePresence, motion } from "motion/react";

import styles from "@/features/orders/new-order-page.module.css";

type OrderToastProps = {
  open: boolean;
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
};

export default function OrderToast({
  open,
  title,
  body,
  closeLabel,
  onClose,
}: OrderToastProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.toast}
          role="status"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.toastBody}>
            <span className={styles.toastTitle}>{title}</span>
            <span className={styles.toastMsg}>{body}</span>
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

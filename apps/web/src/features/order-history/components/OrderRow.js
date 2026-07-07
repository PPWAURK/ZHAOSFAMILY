"use client";

import { motion } from "motion/react";

import styles from "@/features/order-history/order-history-page.module.css";

const STATUS_CLASS = {
  delivered: styles.statusDelivered,
  shipped: styles.statusShipped,
  pending: styles.statusPending,
  draft: styles.statusDraft,
  cancelled: styles.statusCancelled,
  recorded: styles.statusDelivered,
};

function formatDate(iso, lang) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const locale = lang === "zh" ? "zh-CN" : lang === "fr" ? "fr-FR" : "en-GB";
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMoney(amount, symbol) {
  const n = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${n.toFixed(2)}`;
}

export default function OrderRow({
  order,
  index,
  lang,
  copy,
  downloadingPdf,
  deletingOrder,
  onOpenPdf,
  onEditOrder,
  onCreateReturn,
  onDeleteOrder,
}) {
  const statusLabel = copy.status[order.status] || order.status;
  const statusClass = STATUS_CLASS[order.status] || styles.statusDraft;

  return (
    <motion.div
      className={styles.row}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.03, 0.2),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <span className={styles.rowDate}>
        {formatDate(order.date, lang)}
        <span className={styles.rowId}>{order.id}</span>
      </span>
      <span className={styles.rowStore}>{order.store[lang]}</span>
      <span className={styles.rowSupplier}>{order.supplier[lang]}</span>
      <span className={styles.rowItems}>
        {order.itemsCount} {copy.itemsUnit}
      </span>
      <span className={styles.rowTotal}>
        {formatMoney(order.total, copy.currencySymbol)}
      </span>
      <span className={styles.rowStatusCell}>
        <span className={`${styles.statusChip} ${statusClass}`}>
          <span className={styles.statusDot} aria-hidden="true" />
          {statusLabel}
        </span>
      </span>
      <span className={styles.rowActions}>
        <button
          type="button"
          className={`${styles.rowAction} ${styles.rowActionPrimary}`}
          onClick={() => onOpenPdf(order)}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? copy.openingPdf : copy.previewPdf}
        </button>
        <button
          type="button"
          className={styles.rowAction}
          onClick={() => onEditOrder(order)}
          disabled={!order.canEdit || deletingOrder}
        >
          {copy.editOrder}
        </button>
        <button
          type="button"
          className={styles.rowAction}
          onClick={() => onCreateReturn(order)}
          disabled={!order.canReturn || deletingOrder}
        >
          {copy.returnOrder}
        </button>
        <button
          type="button"
          className={`${styles.rowAction} ${styles.rowActionDanger}`}
          onClick={() => onDeleteOrder(order)}
          disabled={!order.canDelete || deletingOrder}
        >
          {deletingOrder ? copy.deletingOrder : copy.deleteOrder}
        </button>
      </span>
    </motion.div>
  );
}

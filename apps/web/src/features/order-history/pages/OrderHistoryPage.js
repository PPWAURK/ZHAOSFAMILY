"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import OrderRow from "@/features/order-history/components/OrderRow";
import {
  ORDER_HISTORY_COPY,
  ORDER_STATUSES,
} from "@/features/order-history/constants/order-history-copy";
import {
  createPurchaseReturn,
  deletePurchaseOrder,
  fetchOrderReturnDraft,
  fetchPurchaseOrderPdf,
  fetchPurchaseOrders,
  fetchPurchaseReturns,
} from "@/features/orders/services/ordersApi";
import styles from "@/features/order-history/order-history-page.module.css";

function resolveErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function toOrderRow(order) {
  return {
    id: order.id,
    number: order.number,
    date: order.deliveryDate,
    storeId: String(order.restaurantId),
    store: {
      zh: order.restaurantName,
      en: order.restaurantName,
      fr: order.restaurantName,
    },
    supplierId: String(order.supplierId),
    supplier: {
      zh: order.supplierName,
      en: order.supplierName,
      fr: order.supplierName,
    },
    itemsCount: order.totalItems,
    total: Number(order.totalAmount) || 0,
    status: "recorded",
    commandeUrl: order.commandeUrl,
  };
}

export default function OrderHistoryPage() {
  const [lang, setLang] = useState("zh");
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [returnDraft, setReturnDraft] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnError, setReturnError] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isLoadingReturnDraft, setIsLoadingReturnDraft] = useState(false);
  const [downloadingPdfOrderId, setDownloadingPdfOrderId] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const t = ORDER_HISTORY_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const orderRows = useMemo(() => orders.map(toOrderRow), [orders]);

  const uniqueStores = useMemo(() => {
    const seen = new Map();
    for (const order of orderRows) {
      if (!seen.has(order.storeId)) {
        seen.set(order.storeId, order.store);
      }
    }
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [orderRows]);

  const filtered = useMemo(() => {
    return orderRows.filter((order) => {
      if (storeFilter !== "all" && order.storeId !== storeFilter) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      return true;
    }).sort((a, b) => {
      if (a.date === b.date) return a.id < b.id ? 1 : -1;
      return a.date < b.date ? 1 : -1;
    });
  }, [orderRows, storeFilter, statusFilter]);

  useEffect(() => {
    let isCancelled = false;

    async function loadOrders() {
      try {
        setIsLoading(true);
        setLoadError("");
        const [nextOrders, nextReturns] = await Promise.all([
          fetchPurchaseOrders(),
          fetchPurchaseReturns(),
        ]);

        if (isCancelled) return;

        setOrders(nextOrders);
        setReturns(nextReturns);
      } catch (nextError) {
        if (isCancelled) return;

        setOrders([]);
        setReturns([]);
        setLoadError(resolveErrorMessage(nextError, t.loadError));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [t.loadError]);

  function resetFilters() {
    setStoreFilter("all");
    setStatusFilter("all");
  }

  const hasFilters = storeFilter !== "all" || statusFilter !== "all";

  async function refreshOrders() {
    const [nextOrders, nextReturns] = await Promise.all([
      fetchPurchaseOrders(),
      fetchPurchaseReturns(),
    ]);
    setOrders(nextOrders);
    setReturns(nextReturns);
  }

  async function handleOpenReturn(order) {
    try {
      setActiveOrder(order);
      setReturnDraft(null);
      setReturnReason("");
      setReturnNotes("");
      setReturnQuantities({});
      setReturnError("");
      setIsLoadingReturnDraft(true);

      const draft = await fetchOrderReturnDraft(order.id);
      setReturnDraft(draft);
    } catch (nextError) {
      setReturnError(resolveErrorMessage(nextError, t.returnSubmitError));
    } finally {
      setIsLoadingReturnDraft(false);
    }
  }

  async function handleOpenPdf(order) {
    if (!order?.id) return;
    const orderId = String(order.id);

    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) {
      previewWindow.opener = null;
    }
    setDownloadingPdfOrderId(orderId);
    setPdfError("");

    try {
      const pdfBlob = await fetchPurchaseOrderPdf(orderId);
      const pdfUrl = URL.createObjectURL(
        pdfBlob.type === "application/pdf"
          ? pdfBlob
          : new Blob([pdfBlob], { type: "application/pdf" }),
      );

      if (previewWindow) {
        previewWindow.location.href = pdfUrl;
      } else {
        window.location.href = pdfUrl;
      }

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (nextError) {
      if (previewWindow) {
        previewWindow.close();
      }
      setPdfError(resolveErrorMessage(nextError, t.pdfOpenError));
    } finally {
      setDownloadingPdfOrderId("");
    }
  }

  async function handleDeleteOrder(order) {
    if (!order?.id) return;
    const orderId = String(order.id);

    const confirmed = window.confirm(
      t.confirmDeleteOrder.replace("{number}", order.number || order.id),
    );
    if (!confirmed) return;

    try {
      setDeletingOrderId(orderId);
      setDeleteError("");
      await deletePurchaseOrder(orderId);
      await refreshOrders();
    } catch (nextError) {
      setDeleteError(resolveErrorMessage(nextError, t.deleteOrderError));
    } finally {
      setDeletingOrderId("");
    }
  }

  function handleCloseReturn() {
    if (isSubmittingReturn) return;
    setActiveOrder(null);
    setReturnDraft(null);
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
    setReturnError("");
  }

  async function handleSubmitReturn() {
    const reason = returnReason.trim();
    const items = Object.entries(returnQuantities)
      .map(([purchaseOrderItemId, quantity]) => ({
        purchaseOrderItemId: Number(purchaseOrderItemId),
        quantity: Number(quantity) || 0,
      }))
      .filter((item) => item.quantity > 0);

    if (!reason) {
      setReturnError(t.returnReasonRequired);
      return;
    }

    if (items.length === 0) {
      setReturnError(t.returnItemRequired);
      return;
    }

    try {
      setIsSubmittingReturn(true);
      setReturnError("");
      await createPurchaseReturn({
        orderId: returnDraft.orderId,
        reason,
        notes: returnNotes.trim() || undefined,
        items,
      });
      await refreshOrders();
      setActiveOrder(null);
      setReturnDraft(null);
      setReturnReason("");
      setReturnNotes("");
      setReturnQuantities({});
      setReturnError("");
    } catch (nextError) {
      setReturnError(resolveErrorMessage(nextError, t.returnSubmitError));
    } finally {
      setIsSubmittingReturn(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.topLeft}>
          <button
            type="button"
            className={`${styles.menuToggle} ${menuOpen ? styles.menuToggleOpen : ""}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? menuLabels.close : menuLabels.open}
          >
            <span className={styles.menuToggleIcon} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {menuOpen ? menuLabels.close : menuLabels.open}
          </button>

          <div className={styles.topIndex}>
            <span>
              <span className={styles.topIndexBold}>ZHAO</span>
              &nbsp;/&nbsp;{t.topFamily}
            </span>
            <span>{t.topStage}</span>
            <span>{t.topCycle}</span>
          </div>
        </div>

        <div className={styles.topLang} role="group" aria-label="Language">
          {DASHBOARD_LANGUAGES.map((option, index) => (
            <Fragment key={option.value}>
              {index > 0 ? <span className={styles.topLangSep}>/</span> : null}
              <button
                type="button"
                className={`${styles.topLangBtn} ${
                  lang === option.value ? styles.topLangBtnActive : ""
                }`}
                onClick={() => setLang(option.value)}
              >
                {option.label}
              </button>
            </Fragment>
          ))}
        </div>
      </header>

      <motion.section
        className={styles.main}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.kicker}>
          <span className={styles.kickerDot} />
          {t.kicker}
        </p>

        <h1 className={styles.title}>
          {t.title}
          <span className={styles.titleEm}>{t.titleEm}</span>
          {t.titleSuffix}
        </h1>

        <p className={styles.lede}>{t.lede}</p>

        <div className={styles.headerActions}>
          <a href="/dashboard/orders/new" className={`${styles.btn} ${styles.btnPrimary}`}>
            + {t.newOrder}
          </a>
        </div>

        <div className={styles.filters} aria-label={t.filtersHeading}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="filter-store">
              {t.filterStore}
            </label>
            <select
              id="filter-store"
              className={styles.filterSelect}
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="all">{t.filterAllStores}</option>
              {uniqueStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.label[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="filter-status">
              {t.filterStatus}
            </label>
            <select
              id="filter-status"
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t.filterAllStatuses}</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t.status[status]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={resetFilters}
            disabled={!hasFilters}
          >
            {t.resetFilters}
          </button>
        </div>

        <p className={styles.listHeading}>
          <span>{t.listHeading}</span>
          <span className={styles.listHeadingCount}>
            {filtered.length} {t.count}
          </span>
        </p>

        {isLoading ? (
          <div className={styles.empty}>{t.loading}</div>
        ) : loadError ? (
          <div className={styles.empty} role="alert">
            {loadError}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>{t.empty}</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>{t.colDate}</span>
              <span>{t.colStore}</span>
              <span>{t.colSupplier}</span>
              <span>{t.colItems}</span>
              <span style={{ textAlign: "right" }}>{t.colTotal}</span>
              <span style={{ textAlign: "right" }}>{t.colStatus}</span>
              <span style={{ textAlign: "right" }}>{t.colActions}</span>
            </div>

            {filtered.map((order, index) => (
              <OrderRow
                key={order.id}
                order={order}
                index={index}
                lang={lang}
                copy={t}
                downloadingPdf={downloadingPdfOrderId === String(order.id)}
                deletingOrder={deletingOrderId === String(order.id)}
                onOpenPdf={handleOpenPdf}
                onCreateReturn={handleOpenReturn}
                onDeleteOrder={handleDeleteOrder}
              />
            ))}
          </div>
        )}

        {pdfError ? (
          <div className={styles.inlineError} role="alert">
            {pdfError}
          </div>
        ) : null}

        {deleteError ? (
          <div className={styles.inlineError} role="alert">
            {deleteError}
          </div>
        ) : null}

        <p className={styles.listHeading}>
          <span>{t.returnsHeading}</span>
          <span className={styles.listHeadingCount}>
            {returns.length} {t.count}
          </span>
        </p>

        {returns.length === 0 ? (
          <div className={styles.empty}>{t.noReturns}</div>
        ) : (
          <div className={styles.returnList}>
            {returns.map((entry) => (
              <article key={entry.id} className={styles.returnCard}>
                <div>
                  <strong>{entry.orderNumber}</strong>
                  <span>{entry.supplierName}</span>
                </div>
                <p>{entry.reason}</p>
                {entry.notes ? <p>{entry.notes}</p> : null}
                <span>
                  {entry.totalItems} {t.itemsUnit}
                </span>
              </article>
            ))}
          </div>
        )}

        <div className={styles.backRow}>
          <a href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </a>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      {activeOrder ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section className={styles.returnModal} role="dialog" aria-modal="true">
            <header className={styles.returnModalHeader}>
              <div>
                <p>{t.returnTitle}</p>
                <h2>{activeOrder.number}</h2>
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={handleCloseReturn}
              >
                {t.closeReturn}
              </button>
            </header>

            {isLoadingReturnDraft ? (
              <div className={styles.empty}>{t.loading}</div>
            ) : returnDraft?.items?.some((item) => item.remainingQuantity > 0) ? (
              <>
                <label className={styles.returnField}>
                  <span>{t.returnReason}</span>
                  <input
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                  />
                </label>
                <label className={styles.returnField}>
                  <span>{t.returnNotes}</span>
                  <textarea
                    value={returnNotes}
                    onChange={(event) => setReturnNotes(event.target.value)}
                  />
                </label>
                <div className={styles.returnItems}>
                  {returnDraft.items
                    .filter((item) => item.remainingQuantity > 0)
                    .map((item) => (
                      <label
                        key={item.purchaseOrderItemId}
                        className={styles.returnItem}
                      >
                        <span>
                          <strong>{item.nameZh || item.nameFr}</strong>
                          <em>
                            {item.specification} / {item.unit}
                          </em>
                          <small>
                            {item.remainingQuantity} {t.itemsUnit}
                          </small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={item.remainingQuantity}
                          value={
                            returnQuantities[item.purchaseOrderItemId] || ""
                          }
                          placeholder="0"
                          onChange={(event) => {
                            const raw = Number(event.target.value) || 0;
                            const quantity = Math.min(
                              Math.max(raw, 0),
                              item.remainingQuantity,
                            );
                            setReturnQuantities((prev) => ({
                              ...prev,
                              [item.purchaseOrderItemId]: quantity,
                            }));
                          }}
                          aria-label={t.returnQuantity}
                        />
                      </label>
                    ))}
                </div>
                {returnError ? (
                  <p className={styles.returnError}>{returnError}</p>
                ) : null}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleSubmitReturn}
                  disabled={isSubmittingReturn}
                >
                  {isSubmittingReturn ? t.submittingReturn : t.submitReturn}
                </button>
              </>
            ) : (
              <div className={styles.empty}>{t.returnEmpty}</div>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

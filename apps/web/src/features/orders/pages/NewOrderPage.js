"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import Sidebar from "@/features/dashboard/components/Sidebar";
import {
  DASHBOARD_LANGUAGES,
  DASHBOARD_MENU_LABELS,
} from "@/features/dashboard/constants/dashboard-copy";
import OrderStepper from "@/features/orders/components/OrderStepper";
import OrderToast from "@/features/orders/components/OrderToast";
import StepProducts from "@/features/orders/components/StepProducts";
import StepReview from "@/features/orders/components/StepReview";
import StepSupplier from "@/features/orders/components/StepSupplier";
import { NEW_ORDER_COPY } from "@/features/orders/constants/orders-copy";
import {
  fetchOrderInventory,
  fetchOrderProducts,
  fetchOrderSuppliers,
  getOrderProductVariants,
  supplierEnforcesStock,
} from "@/features/orders/services/orderCatalogApi";
import {
  createPurchaseOrder,
  fetchPurchaseOrder,
  fetchPurchaseOrderPdf,
  updatePurchaseOrder,
} from "@/features/orders/services/ordersApi";
import { shareOrderPdf } from "@/features/orders/services/orderPdfSharing";
import { usePreferredLanguage } from "@/shared/hooks/usePreferredLanguage";
import styles from "@/features/orders/new-order-page.module.css";

function getDefaultDeliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function resolveErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function getEditOrderIdFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("editOrderId") || "";
}

function buildQuantitiesFromOrderItems(items) {
  if (!Array.isArray(items)) {
    return {};
  }

  return items.reduce((nextQuantities, item) => {
    const productId = item?.productId;
    const quantity = Number(item?.quantity) || 0;

    if (!productId || quantity <= 0) {
      return nextQuantities;
    }

    const slot = Number(item.specificationSlot) || 1;

    return {
      ...nextQuantities,
      [`${productId}:${slot}`]: quantity,
    };
  }, {});
}

async function openPurchaseOrderPdf(orderId, previewWindow = null) {
  const targetWindow = previewWindow || window.open("about:blank", "_blank");
  if (targetWindow) {
    targetWindow.opener = null;
  }

  try {
    const pdfBlob = await fetchPurchaseOrderPdf(String(orderId));
    const pdfUrl = URL.createObjectURL(
      pdfBlob.type === "application/pdf"
        ? pdfBlob
        : new Blob([pdfBlob], { type: "application/pdf" }),
    );

    if (targetWindow) {
      targetWindow.location.href = pdfUrl;
    } else {
      window.location.href = pdfUrl;
    }

    window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  } catch (error) {
    if (targetWindow) {
      targetWindow.close();
    }

    throw error;
  }
}

export default function NewOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [lang, setLang] = usePreferredLanguage();
  const [editOrderId] = useState(getEditOrderIdFromLocation);
  const [editingOrderNumber, setEditingOrderNumber] = useState("");
  const [isLoadingEditOrder, setIsLoadingEditOrder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [supplierId, setSupplierId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [suppliersError, setSuppliersError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [stockMap, setStockMap] = useState({});
  const [quantities, setQuantities] = useState({});
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate);
  const [error, setError] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [latestCreatedOrder, setLatestCreatedOrder] = useState(null);
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const [isSharingOrder, setIsSharingOrder] = useState(false);

  const t = NEW_ORDER_COPY[lang];
  const menuLabels = DASHBOARD_MENU_LABELS[lang];
  const isEditingOrder = Boolean(editOrderId);
  const storeName = user?.store?.name || user?.storeName || user?.establishment || "—";

  const hasAnyProduct = useMemo(
    () => Object.values(quantities).some((q) => Number(q) > 0),
    [quantities],
  );

  const estimatedTotal = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum +
          getOrderProductVariants(product).reduce((variantSum, variant) => {
            const qty = Number(quantities[variant.id]) || 0;
            if (!Number.isFinite(variant.price)) {
              return variantSum;
            }
            return variantSum + qty * variant.price;
          }, 0),
        0,
      ),
    [products, quantities],
  );

  const stockViolation = useMemo(() => {
    if (!supplierEnforcesStock(supplierId)) return null;
    for (const product of products) {
      let totalQty = 0;
      // variant ids are `${productId}:${key}`
      for (const [variantId, qty] of Object.entries(quantities)) {
        if (variantId.startsWith(`${product.id}:`)) {
          totalQty += Number(qty) || 0;
        }
      }
      if (totalQty <= 0) continue;
      const stock = Number(stockMap?.[String(product.id)] ?? 0);
      if (totalQty > stock) {
        const name = (lang === "zh" ? product.nameCn : product.nameFr || product.nameCn) || "—";
        return { name, stock };
      }
    }
    return null;
  }, [products, quantities, stockMap, supplierId, lang]);

  useEffect(() => {
    if (!editOrderId) {
      return undefined;
    }

    let isCancelled = false;

    async function loadEditableOrder() {
      try {
        setIsLoadingEditOrder(true);
        setError("");
        const order = await fetchPurchaseOrder(editOrderId);

        if (isCancelled) {
          return;
        }

        if (order?.canEdit === false) {
          setError(t.orderCannotEdit);
          return;
        }

        setEditingOrderNumber(String(order?.number || editOrderId));
        setSupplierId(String(order?.supplierId || ""));
        setDeliveryDate(order?.deliveryDate || getDefaultDeliveryDate());
        setQuantities(buildQuantitiesFromOrderItems(order?.items));
        setStepIndex(1);
      } catch (nextError) {
        if (!isCancelled) {
          setError(resolveErrorMessage(nextError, t.loadEditOrderError));
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingEditOrder(false);
        }
      }
    }

    void loadEditableOrder();

    return () => {
      isCancelled = true;
    };
  }, [editOrderId, t.loadEditOrderError, t.orderCannotEdit]);

  useEffect(() => {
    let isCancelled = false;

    async function loadSuppliers() {
      try {
        setIsLoadingSuppliers(true);
        setSuppliersError("");
        const nextSuppliers = await fetchOrderSuppliers();

        if (isCancelled) {
          return;
        }

        setSuppliers(nextSuppliers);
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setSuppliers([]);
        setSuppliersError(resolveErrorMessage(nextError, t.loadSuppliersError));
      } finally {
        if (!isCancelled) {
          setIsLoadingSuppliers(false);
        }
      }
    }

    void loadSuppliers();

    return () => {
      isCancelled = true;
    };
  }, [t.loadSuppliersError]);

  useEffect(() => {
    if (!supplierId) {
      setProducts([]);
      setStockMap({});
      setProductsError("");
      setIsLoadingProducts(false);
      return undefined;
    }

    let isCancelled = false;

    async function loadProducts() {
      try {
        setIsLoadingProducts(true);
        setProductsError("");
        const [nextProducts, nextStock] = await Promise.all([
          fetchOrderProducts(supplierId),
          fetchOrderInventory(supplierId).catch(() => ({})),
        ]);

        if (isCancelled) {
          return;
        }

        setProducts(nextProducts);
        setStockMap(nextStock || {});
      } catch (nextError) {
        if (isCancelled) {
          return;
        }

        setProducts([]);
        setStockMap({});
        setProductsError(resolveErrorMessage(nextError, t.loadProductsError));
      } finally {
        if (!isCancelled) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [supplierId, t.loadProductsError]);

  function handleNext() {
    setError("");
    if (stepIndex === 0 && !supplierId) {
      setError(t.selectSupplierFirst);
      return;
    }
    if (stepIndex === 1 && !hasAnyProduct) {
      setError(t.selectAtLeastOneProduct);
      return;
    }
    if (stepIndex === 1 && stockViolation) {
      setError(
        t.stockExceeded
          .replace("{name}", stockViolation.name)
          .replace("{stock}", String(stockViolation.stock)),
      );
      return;
    }
    setStepIndex((i) => Math.min(i + 1, t.steps.length - 1));
  }

  function handlePrev() {
    setError("");
    if (isEditingOrder && stepIndex <= 1) {
      return;
    }

    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleJump(targetIndex) {
    if (isEditingOrder && targetIndex === 0) {
      return;
    }

    if (targetIndex < stepIndex) {
      setError("");
      setStepIndex(targetIndex);
    }
  }

  function handleChangeSupplier(nextId) {
    if (isEditingOrder) {
      return;
    }

    setSupplierId(nextId);
    setQuantities({});
  }

  async function handleSubmit() {
    if (!hasAnyProduct) {
      setError(t.selectAtLeastOneProduct);
      return;
    }
    if (!deliveryDate) {
      setError(t.selectDeliveryDate);
      return;
    }
    if (stockViolation) {
      setError(
        t.stockExceeded
          .replace("{name}", stockViolation.name)
          .replace("{stock}", String(stockViolation.stock)),
      );
      return;
    }

    const previewWindow = isEditingOrder ? window.open("about:blank", "_blank") : null;
    if (previewWindow) previewWindow.opener = null;

    try {
      setSubmitting(true);
      setError("");
      const savedOrder = isEditingOrder
        ? await updatePurchaseOrder(editOrderId, { deliveryDate, quantities })
        : await createPurchaseOrder({ deliveryDate, quantities });

      if (isEditingOrder) {
        try {
          await openPurchaseOrderPdf(savedOrder.id, previewWindow);
        } catch (pdfError) {
          setError(resolveErrorMessage(pdfError, t.pdfOpenError));
        }
      } else {
        setLatestCreatedOrder(savedOrder);
        setSharePromptOpen(true);
      }

      setSubmitting(false);
      setToastOpen(true);
      if (!isEditingOrder) {
        setSupplierId(null);
        setQuantities({});
        setDeliveryDate(getDefaultDeliveryDate());
        setStepIndex(0);
      }
    } catch (nextError) {
      if (previewWindow) {
        previewWindow.close();
      }
      setError(resolveErrorMessage(nextError, t.submitError));
      setSubmitting(false);
    }
  }

  async function handleShareCreatedOrder() {
    if (!latestCreatedOrder || isSharingOrder) {
      return;
    }

    setIsSharingOrder(true);
    setError("");

    try {
      const result = await shareOrderPdf(latestCreatedOrder);

      if (result === "shared") {
        setSharePromptOpen(false);
        router.push("/dashboard/orders");
        return;
      }

      if (result === "cancelled") {
        return;
      }

      if (result === "downloaded") {
        setSharePromptOpen(false);
        router.push("/dashboard/orders");
        return;
      }

      setError(t.pdfShareError);
    } finally {
      setIsSharingOrder(false);
    }
  }

  const isLastStep = stepIndex === t.steps.length - 1;

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
          {isEditingOrder ? t.editKicker : t.kicker}
        </p>

        <h1 className={styles.title}>
          {isEditingOrder ? t.editTitle : t.title}
          <span className={styles.titleEm}>{isEditingOrder ? t.editTitleEm : t.titleEm}</span>
          {isEditingOrder ? t.editTitleSuffix : t.titleSuffix}
        </h1>

        <p className={styles.lede}>
          {isEditingOrder
            ? t.editLede.replace("{number}", editingOrderNumber || editOrderId)
            : t.lede}
        </p>

        {isLoadingEditOrder ? <div className={styles.statePanel}>{t.loadingEditOrder}</div> : null}

        <OrderStepper steps={t.steps} currentIndex={stepIndex} onJump={handleJump} />

        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {stepIndex === 0 ? (
            <StepSupplier
              lang={lang}
              suppliers={suppliers}
              isLoading={isLoadingSuppliers}
              loadError={suppliersError}
              selectedId={supplierId}
              onSelect={handleChangeSupplier}
              disabled={isEditingOrder}
              copy={t}
            />
          ) : null}

          {stepIndex === 1 ? (
            <StepProducts
              lang={lang}
              supplierId={supplierId}
              orderNotice={
                suppliers.find((item) => String(item.id) === String(supplierId))?.orderNotice || ""
              }
              products={products}
              isLoading={isLoadingProducts}
              loadError={productsError}
              quantities={quantities}
              stockMap={stockMap}
              stockEnforced={supplierEnforcesStock(supplierId)}
              onChangeQty={(id, value) => setQuantities((prev) => ({ ...prev, [id]: value }))}
              copy={t}
            />
          ) : null}

          {stepIndex === 2 ? (
            <StepReview
              lang={lang}
              storeName={storeName}
              supplierId={supplierId}
              suppliers={suppliers}
              products={products}
              quantities={quantities}
              stockMap={stockMap}
              stockEnforced={supplierEnforcesStock(supplierId)}
              deliveryDate={deliveryDate}
              onChangeDeliveryDate={setDeliveryDate}
              copy={t}
            />
          ) : null}
        </motion.div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={handlePrev}
            disabled={stepIndex === 0 || (isEditingOrder && stepIndex <= 1) || submitting}
          >
            {t.prev}
          </button>

          {error ? <span className={styles.error}>{error}</span> : <span />}

          {isLastStep ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? isEditingOrder
                  ? t.updating
                  : t.submitting
                : isEditingOrder
                  ? t.updateOrder
                  : t.submit}
              {!submitting && estimatedTotal > 0 ? (
                <span className={styles.btnTotal}>
                  {` · ${estimatedTotal.toFixed(2)} ${t.currencySymbol}`}
                </span>
              ) : null}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleNext}
            >
              {t.next}
            </button>
          )}
        </div>

        <div className={styles.backRow}>
          <Link href="/dashboard" className={styles.backLink}>
            ← {t.back}
          </Link>
        </div>
      </motion.section>

      <footer className={styles.footer}>{t.footer}</footer>

      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} lang={lang} />

      <OrderToast
        open={toastOpen}
        title={isEditingOrder ? t.updateToastTitle : t.toastTitle}
        body={isEditingOrder ? t.updateToastBody : t.toastBody}
        closeLabel={t.toastClose}
        onClose={() => setToastOpen(false)}
      />

      {sharePromptOpen && latestCreatedOrder ? (
        <div className={styles.shareOverlay} role="presentation">
          <motion.section
            className={styles.shareDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-share-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.shareHeader}>
              <span className={styles.shareIcon} aria-hidden="true">
                ↗
              </span>
              <div>
                <h2 id="order-share-title" className={styles.shareTitle}>
                  {t.sharePromptTitle}
                </h2>
                <p className={styles.shareSubtitle}>{t.sharePromptSubtitle}</p>
              </div>
            </div>

            <p className={styles.shareMeta}>
              {t.orderNumberLabel}: {latestCreatedOrder.number || latestCreatedOrder.id}
            </p>

            <div className={styles.shareActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleShareCreatedOrder}
                disabled={isSharingOrder}
              >
                {isSharingOrder ? t.sharingOrder : t.shareToWechatButton}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setSharePromptOpen(false)}
                disabled={isSharingOrder}
              >
                {t.shareLaterButton}
              </button>
            </div>
          </motion.section>
        </div>
      ) : null}
    </main>
  );
}

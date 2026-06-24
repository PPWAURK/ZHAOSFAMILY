"use client";

import { useEffect, useMemo, useState } from "react";

import OrderProductImage from "@/features/orders/components/OrderProductImage";
import {
  getOrderProductName,
  getOrderProductUnit,
  getOrderProductVariants,
} from "@/features/orders/services/orderCatalogApi";
import styles from "@/features/orders/new-order-page.module.css";

const ALL_CATEGORIES = "__all__";
const UNCATEGORIZED_CATEGORY = "__uncategorized__";

function normalizeCategoryKey(category) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatMoney(amount, symbol) {
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${amount.toFixed(2)} ${symbol}`;
}

function getProductCategory(product, fallbackLabel) {
  return product.category?.trim() || fallbackLabel;
}

function getProductCategoryLabel(category, copy) {
  if (category === UNCATEGORIZED_CATEGORY) {
    return copy.productUncategorized;
  }

  const normalizedCategory = normalizeCategoryKey(category);
  return copy.productCategoryNames?.[normalizedCategory] || category;
}

function getProductCategoryOrder(category, copy) {
  if (category === UNCATEGORIZED_CATEGORY) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalizedCategory = normalizeCategoryKey(category);
  const orderIndex = copy.productCategoryOrder?.indexOf(normalizedCategory);
  return orderIndex >= 0 ? orderIndex : Number.MAX_SAFE_INTEGER - 1;
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function scrollToPageBottom() {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth",
  });
}

export default function StepProducts({
  lang,
  supplierId,
  orderNotice,
  products,
  isLoading,
  loadError,
  quantities,
  onChangeQty,
  copy,
  stockMap,
  stockEnforced,
}) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const step = copy.steps.find((item) => item.id === "products");
  const categoryOptions = useMemo(() => {
    const categories = new Map();

    for (const product of products) {
      const category = getProductCategory(product, UNCATEGORIZED_CATEGORY);
      categories.set(category, {
        value: category,
        label: getProductCategoryLabel(category, copy),
        order: getProductCategoryOrder(category, copy),
      });
    }

    return Array.from(categories.values()).sort(
      (a, b) => a.order - b.order || a.label.localeCompare(b.label, lang),
    );
  }, [products, copy, lang]);
  const visibleProducts = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) {
      return products;
    }

    return products.filter(
      (product) => getProductCategory(product, UNCATEGORIZED_CATEGORY) === selectedCategory,
    );
  }, [products, selectedCategory]);
  const total = products.reduce(
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
  );

  useEffect(() => {
    const categoryExists = categoryOptions.some((category) => category.value === selectedCategory);

    if (selectedCategory !== ALL_CATEGORIES && !categoryExists) {
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [categoryOptions, selectedCategory]);

  function changeQtyBy(variantId, delta, stock) {
    const current = Number(quantities[variantId]) || 0;
    let next = Math.max(0, current + delta);
    if (stockEnforced && Number.isFinite(stock) && next > stock) {
      next = stock;
    }
    onChangeQty(variantId, next);
  }

  function renderCategoryFilter() {
    if (products.length === 0) {
      return null;
    }

    return (
      <label className={styles.listCategoryFilter}>
        <span>{copy.productCategoryLabel}</span>
        <select
          className={styles.listCategorySelect}
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value={ALL_CATEGORIES}>{copy.productAllCategories}</option>
          {categoryOptions.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function renderScrollButtons() {
    if (products.length === 0) {
      return null;
    }

    return (
      <aside className={styles.floatingScrollControls} aria-label={copy.productQuickToolsLabel}>
        <button
          type="button"
          className={styles.floatingScrollButton}
          onClick={scrollToPageTop}
          aria-label={copy.scrollToTop}
        >
          ↑
        </button>
        <button
          type="button"
          className={styles.floatingScrollButton}
          onClick={scrollToPageBottom}
          aria-label={copy.scrollToBottom}
        >
          ↓
        </button>
      </aside>
    );
  }

  function renderContent() {
    if (!supplierId) {
      return <div className={styles.statePanel}>{copy.selectSupplierFirst}</div>;
    }

    if (isLoading) {
      return <div className={styles.statePanel}>{copy.loadingProducts}</div>;
    }

    if (loadError) {
      return (
        <div className={styles.statePanel} role="alert">
          {loadError}
        </div>
      );
    }

    if (products.length === 0) {
      return <div className={styles.statePanel}>{copy.emptyProductCatalog}</div>;
    }

    return (
      <>
        <div className={styles.productTable}>
          <div className={`${styles.productRow} ${styles.productHeader}`}>
            <span>{copy.productImage}</span>
            <span>{copy.productList}</span>
            <span>{copy.productSpecification}</span>
            <span>{copy.quantity}</span>
            <span className={styles.productUnit}>{copy.productUnit}</span>
            <span style={{ textAlign: "right" }}>{copy.subtotal}</span>
          </div>

          {visibleProducts.map((product) => {
            const productName = getOrderProductName(product, lang);
            const productMeta = [product.reference].filter(Boolean).join(" · ");
            const rawCategory = product.category?.trim();
            const categoryLabel = rawCategory ? getProductCategoryLabel(rawCategory, copy) : "";
            const variants = getOrderProductVariants(product);
            const stock = stockEnforced ? Number(stockMap?.[String(product.id)] ?? 0) : null;
            const isOutOfStock = stockEnforced && stock <= 0;

            return (
              <div key={product.id} className={styles.productRow}>
                <span className={styles.productImageCell}>
                  <OrderProductImage
                    image={product.image}
                    alt={productName}
                    fallbackLabel={productName.slice(0, 1)}
                  />
                </span>
                <span className={styles.productNameCell}>
                  <span className={styles.productName}>{productName}</span>
                  {productMeta ? <span className={styles.productMeta}>{productMeta}</span> : null}
                  {stockEnforced ? (
                    <span className={isOutOfStock ? styles.productStockOut : styles.productStockOk}>
                      {isOutOfStock ? copy.outOfStock : copy.inStock}
                    </span>
                  ) : null}
                </span>
                <span className={styles.productCellStack}>
                  <span className={styles.specRefLabel}>{copy.caseSpecReference}</span>
                  {variants.map((variant) => (
                    <span key={variant.id} className={styles.productCellValue}>
                      {variant.specification || "—"}
                    </span>
                  ))}
                </span>
                <span className={styles.productCellStack}>
                  {variants.map((variant) => {
                    const qty = Number(quantities[variant.id]) || 0;
                    const inputProps = {};
                    if (stockEnforced && Number.isFinite(stock)) {
                      inputProps.max = stock;
                    }

                    return (
                      <span key={variant.id} className={styles.qtyStepper}>
                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => changeQtyBy(variant.id, -1, stock)}
                          disabled={isOutOfStock || qty <= 0}
                          aria-label="−"
                          tabIndex={-1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          {...inputProps}
                          className={styles.qtyInput}
                          value={qty === 0 ? "" : qty}
                          placeholder={isOutOfStock ? "—" : "0"}
                          disabled={isOutOfStock}
                          onChange={(e) => {
                            const raw = e.target.value;
                            let parsed = raw === "" ? 0 : Math.max(0, Number(raw));
                            if (stockEnforced && Number.isFinite(stock) && parsed > stock) {
                              parsed = stock;
                            }
                            onChangeQty(variant.id, Number.isFinite(parsed) ? parsed : 0);
                          }}
                          aria-label={`${productName} ${variant.specification || variant.unit || ""}`.trim()}
                        />
                        <button
                          type="button"
                          className={styles.stepperBtn}
                          onClick={() => changeQtyBy(variant.id, 1, stock)}
                          disabled={
                            isOutOfStock ||
                            (stockEnforced && Number.isFinite(stock) && qty >= stock)
                          }
                          aria-label="+"
                          tabIndex={-1}
                        >
                          +
                        </button>
                      </span>
                    );
                  })}
                </span>
                <span className={`${styles.productUnit} ${styles.productCellStack}`}>
                  {variants.map((variant) => (
                    <span key={variant.id} className={styles.productCellValue}>
                      {variant.unit || getOrderProductUnit(product)}
                    </span>
                  ))}
                </span>
                <span className={`${styles.productSubtotal} ${styles.productCellStack}`}>
                  {variants.map((variant) => {
                    const qty = Number(quantities[variant.id]) || 0;
                    const subtotal = Number.isFinite(variant.price) ? qty * variant.price : null;

                    return (
                      <span key={variant.id} className={styles.productCellValue}>
                        {formatMoney(subtotal, copy.currencySymbol)}
                      </span>
                    );
                  })}
                </span>
                {categoryLabel ? (
                  <span className={styles.productCatPill}>{categoryLabel}</span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={styles.productTotal}>
          <span className={styles.productTotalLabel}>{copy.total}</span>
          <span className={styles.productTotalValue}>
            {formatMoney(total, copy.currencySymbol)}
          </span>
        </div>
      </>
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionHeading}>{step?.title}</h2>
        <p className={styles.sectionHint}>{step?.hint}</p>
      </header>

      {supplierId && orderNotice ? (
        <div className={styles.orderNotice}>
          <span className={styles.orderNoticeLabel}>{copy.orderNoticeLabel}</span>
          {orderNotice}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <p className={styles.listHeading}>{copy.productList}</p>
        {renderCategoryFilter()}
      </div>

      {renderContent()}
      {renderScrollButtons()}
    </section>
  );
}

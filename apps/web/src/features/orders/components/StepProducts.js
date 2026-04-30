"use client";

import OrderProductImage from "@/features/orders/components/OrderProductImage";
import {
  getOrderProductName,
  getOrderProductUnit,
  getOrderProductVariants,
} from "@/features/orders/services/orderCatalogApi";
import styles from "@/features/orders/new-order-page.module.css";

function formatMoney(amount, symbol) {
  if (!Number.isFinite(amount)) {
    return "—";
  }

  return `${amount.toFixed(2)} ${symbol}`;
}

export default function StepProducts({
  lang,
  supplierId,
  products,
  isLoading,
  loadError,
  quantities,
  onChangeQty,
  copy,
  stockMap,
  stockEnforced,
}) {
  const step = copy.steps.find((item) => item.id === "products");
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
      return (
        <div className={styles.statePanel}>{copy.emptyProductCatalog}</div>
      );
    }

    return (
      <>
        <div className={styles.productTable}>
          <div className={`${styles.productRow} ${styles.productHeader}`}>
            <span>{copy.productImage}</span>
            <span>{copy.productList}</span>
            <span>{copy.productSpecification}</span>
            <span className={styles.productUnit}>{copy.productUnit}</span>
            <span className={styles.productPrice}>{copy.productPrice}</span>
            <span>{copy.quantity}</span>
            <span style={{ textAlign: "right" }}>{copy.subtotal}</span>
          </div>

          {products.map((product) => {
            const productName = getOrderProductName(product, lang);
            const productMeta = [product.reference].filter(Boolean).join(" · ");
            const variants = getOrderProductVariants(product);
            const stock = stockEnforced
              ? Number(stockMap?.[String(product.id)] ?? 0)
              : null;
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
                  {productMeta ? (
                    <span className={styles.productMeta}>{productMeta}</span>
                  ) : null}
                  {stockEnforced ? (
                    <span
                      className={
                        isOutOfStock
                          ? styles.productStockOut
                          : styles.productStockOk
                      }
                    >
                      {isOutOfStock ? copy.outOfStock : copy.inStock}
                    </span>
                  ) : null}
                </span>
                <span className={styles.productCellStack}>
                  {variants.map((variant) => (
                    <span key={variant.id} className={styles.productCellValue}>
                      {variant.specification || "—"}
                    </span>
                  ))}
                </span>
                <span className={`${styles.productUnit} ${styles.productCellStack}`}>
                  {variants.map((variant) => (
                    <span key={variant.id} className={styles.productCellValue}>
                      {variant.unit || getOrderProductUnit(product)}
                    </span>
                  ))}
                </span>
                <span className={`${styles.productPrice} ${styles.productCellStack}`}>
                  {variants.map((variant) => (
                    <span key={variant.id} className={styles.productCellValue}>
                      {formatMoney(variant.price, copy.currencySymbol)}
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
                      <input
                        key={variant.id}
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
                          let parsed =
                            raw === "" ? 0 : Math.max(0, Number(raw));
                          if (
                            stockEnforced &&
                            Number.isFinite(stock) &&
                            parsed > stock
                          ) {
                            parsed = stock;
                          }
                          onChangeQty(
                            variant.id,
                            Number.isFinite(parsed) ? parsed : 0,
                          );
                        }}
                        aria-label={`${productName} ${variant.specification || variant.unit || ""}`.trim()}
                      />
                    );
                  })}
                </span>
                <span className={`${styles.productSubtotal} ${styles.productCellStack}`}>
                  {variants.map((variant) => {
                    const qty = Number(quantities[variant.id]) || 0;
                    const subtotal = Number.isFinite(variant.price)
                      ? qty * variant.price
                      : null;

                    return (
                      <span key={variant.id} className={styles.productCellValue}>
                        {formatMoney(subtotal, copy.currencySymbol)}
                      </span>
                    );
                  })}
                </span>
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

      <p className={styles.listHeading}>{copy.productList}</p>

      {renderContent()}
    </section>
  );
}

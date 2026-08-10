"use client";

import OrderProductImage from "@/features/orders/components/OrderProductImage";
import { convertOrderQuantityToCases } from "@zhao/utils";
import {
  getLocalizedOrderUnit,
  getOrderCaseLabel,
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

function formatOrderQuantity(quantity, caseSize, unit, lang) {
  const convertedQuantity = convertOrderQuantityToCases(quantity, caseSize);
  const localizedUnit = getLocalizedOrderUnit(unit, lang);

  if (!convertedQuantity) {
    return `${quantity} ${localizedUnit}`;
  }

  return `${convertedQuantity.caseQuantity} ${getOrderCaseLabel(lang)}${
    convertedQuantity.remainingQuantity
      ? ` + ${convertedQuantity.remainingQuantity} ${localizedUnit}`
      : ""
  }`;
}

export default function StepReview({
  lang,
  storeName,
  supplierId,
  suppliers,
  products,
  quantities,
  deliveryDate,
  onChangeDeliveryDate,
  copy,
}) {
  const step = copy.steps.find((item) => item.id === "review");
  const supplier = suppliers.find((item) => item.id === supplierId);
  const items = products
    .flatMap((product) =>
      getOrderProductVariants(product).map((variant) => ({
        ...product,
        variant,
        qty: Number(quantities[variant.id]) || 0,
      })),
    )
    .filter((product) => product.qty > 0);
  const total = items.reduce((sum, item) => {
    if (!Number.isFinite(item.variant.price)) {
      return sum;
    }

    const orderedQuantity =
      convertOrderQuantityToCases(item.qty, item.variant.caseSize)?.orderedQuantity ?? item.qty;
    return sum + orderedQuantity * item.variant.price;
  }, 0);

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionHeading}>{step?.title}</h2>
        <p className={styles.sectionHint}>{step?.hint}</p>
      </header>

      <dl className={styles.reviewBlock}>
        <div className={styles.reviewRow}>
          <dt>{copy.reviewStoreLabel}</dt>
          <dd>{storeName || "—"}</dd>
        </div>
        <div className={styles.reviewRow}>
          <dt>{copy.reviewSupplierLabel}</dt>
          <dd>{supplier ? supplier.name : "—"}</dd>
        </div>
        <div className={styles.reviewRow}>
          <dt>{copy.reviewDeliveryDateLabel}</dt>
          <dd>
            <input
              type="date"
              className={styles.reviewDateInput}
              value={deliveryDate}
              onChange={(event) => onChangeDeliveryDate(event.target.value)}
            />
          </dd>
        </div>
        <div className={styles.reviewRow}>
          <dt>{copy.reviewTotalLabel}</dt>
          <dd>{formatMoney(total, copy.currencySymbol)}</dd>
        </div>
      </dl>

      <p className={styles.listHeading}>{copy.reviewItemsLabel}</p>

      {items.length === 0 ? (
        <p className={styles.reviewEmpty}>{copy.emptyProducts}</p>
      ) : (
        <div className={styles.reviewItems}>
          {items.map((item) => {
            const orderedQuantity =
              convertOrderQuantityToCases(item.qty, item.variant.caseSize)?.orderedQuantity ?? item.qty;
            const subtotal = Number.isFinite(item.variant.price)
              ? orderedQuantity * item.variant.price
              : null;
            const productName = getOrderProductName(item, lang);
            const variantLabel = item.variant.specification || getLocalizedOrderUnit(
              getOrderProductUnit(item),
              lang,
            );

            return (
              <div key={item.variant.id} className={styles.reviewItem}>
                <span className={styles.reviewItemImageCell}>
                  <OrderProductImage
                    image={item.image}
                    alt={productName}
                    fallbackLabel={productName.slice(0, 1)}
                  />
                </span>
                <span className={styles.reviewItemNameCell}>
                  <span>{productName}</span>
                  <span className={styles.reviewItemVariant}>{variantLabel}</span>
                </span>
                <span className={styles.reviewItemQty}>
                  ×{" "}
                  {formatOrderQuantity(
                    item.qty,
                    item.variant.caseSize,
                    item.variant.unit || getOrderProductUnit(item),
                    lang,
                  )}
                </span>
                <span className={styles.reviewItemSubtotal}>
                  {formatMoney(subtotal, copy.currencySymbol)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

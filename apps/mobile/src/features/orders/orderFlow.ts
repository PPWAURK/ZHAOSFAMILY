import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  getOrderProductName,
  getOrderProductVariants,
} from "@/features/orders/orderApi";
import type {
  OrderProduct,
  OrderProductVariant,
  OrderStockMap,
  QuantityMap,
} from "@/features/orders/orderTypes";

export type OrderStep = "edit" | "confirm" | "complete" | "share";
export type DeliveryMode = "today" | "tomorrow" | "other";

export type SelectedOrderLine = {
  product: OrderProduct;
  quantity: number;
  variant: OrderProductVariant;
};

export type StockViolation = {
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
};

export function getDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return getDateString(date);
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && value === getDateString(date);
}

export function getDeliveryDate(mode: DeliveryMode, customDate: string): string {
  if (mode === "today") return getDateAfterDays(0);
  if (mode === "tomorrow") return getDateAfterDays(1);
  return customDate.trim();
}

export function getStockViolation(
  products: OrderProduct[],
  quantities: QuantityMap,
  stockMap: OrderStockMap,
  language: AuthLanguage,
): StockViolation | null {
  for (const product of products) {
    const requestedQuantity = getOrderProductVariants(product).reduce(
      (sum, variant) => sum + (Number(quantities[variant.id]) || 0),
      0,
    );
    const availableQuantity = stockMap[product.id] ?? 0;

    if (requestedQuantity > availableQuantity) {
      return {
        productName: getOrderProductName(product, language),
        requestedQuantity,
        availableQuantity,
      };
    }
  }

  return null;
}

export function getSelectedLines(
  products: OrderProduct[],
  quantities: QuantityMap,
): SelectedOrderLine[] {
  return products.flatMap((product) =>
    getOrderProductVariants(product)
      .map((variant) => ({
        product,
        variant,
        quantity: Number(quantities[variant.id]) || 0,
      }))
      .filter((line) => line.quantity > 0),
  );
}

export function filterProducts(
  products: OrderProduct[],
  search: string,
  selectedCategory: string,
  language: AuthLanguage,
): OrderProduct[] {
  const normalizedSearch = search.trim().toLowerCase();

  return products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const searchableText = [
      getOrderProductName(product, language),
      product.nameCn,
      product.nameFr,
      product.reference,
      product.category,
      product.specification,
      product.specification2,
      product.specification3,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesCategory && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });
}

function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

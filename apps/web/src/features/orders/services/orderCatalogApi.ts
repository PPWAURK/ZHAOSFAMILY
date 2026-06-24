import { fetchRegisterStores } from "@/features/stores/services/restaurantsApi";
import { apiClient } from "@/shared/api/api-client";
import type { StoreOption } from "@/features/stores/types/store";
import type {
  OrderInventoryLine,
  OrderProduct,
  OrderProductApiRecord,
  OrderProductVariant,
  OrderStockMap,
  OrderSupplier,
} from "@/features/orders/types/order";

// Suppliers that enforce stock rules on the order flow (0 stock = out of order).
export const STOCK_ENFORCED_SUPPLIER_IDS = new Set<string>(["8"]);

export function supplierEnforcesStock(supplierId: number | string | null | undefined): boolean {
  if (supplierId === null || supplierId === undefined) return false;
  return STOCK_ENFORCED_SUPPLIER_IDS.has(String(supplierId));
}

function buildProductVariants(product: OrderProductApiRecord): OrderProductVariant[] {
  const variantFields = [
    {
      key: "1",
      specification: product.specification,
      unit: product.unit,
      price: product.unitPriceHt,
    },
    {
      key: "2",
      specification: product.specification2,
      unit: product.unit2,
      price: product.unitPriceHt2,
    },
    {
      key: "3",
      specification: product.specification3,
      unit: product.unit3,
      price: product.unitPriceHt3,
    },
  ];

  const variants = variantFields
    .filter((variant) => variant.specification || variant.unit || Number.isFinite(variant.price))
    .map((variant) => ({
      id: `${product.id}:${variant.key}`,
      specification: variant.specification || null,
      unit: variant.unit || null,
      price: Number.isFinite(variant.price) ? Number(variant.price) : null,
    }));

  return variants.length > 0 ? variants : [];
}

export async function fetchOrderStores(): Promise<StoreOption[]> {
  return fetchRegisterStores();
}

export async function fetchOrderSuppliers(): Promise<OrderSupplier[]> {
  const suppliers = await apiClient.get<OrderSupplier[]>("/suppliers");

  if (!Array.isArray(suppliers)) {
    return [];
  }

  return suppliers.map((supplier) => ({
    id: String(supplier.id),
    name: supplier.name,
    sortOrder: supplier.sortOrder,
    includeAllProductsInOrder: supplier.includeAllProductsInOrder,
    orderNotice: supplier.orderNotice ?? null,
  }));
}

export async function fetchOrderProducts(supplierId: string): Promise<OrderProduct[]> {
  const products = await apiClient.get<OrderProductApiRecord[]>(
    `/products?supplierId=${encodeURIComponent(supplierId)}`,
  );

  if (!Array.isArray(products)) {
    return [];
  }

  return products.map((product) => ({
    id: String(product.id),
    supplierId: String(product.supplierId),
    reference: product.reference,
    category: product.category,
    nameCn: product.nameCn,
    nameFr: product.designationFr,
    unit: product.unit,
    price: typeof product.unitPriceHt === "number" ? product.unitPriceHt : null,
    image: product.image,
    specification: product.specification,
    specification2: product.specification2,
    specification3: product.specification3,
    unit2: product.unit2,
    unit3: product.unit3,
    price2: typeof product.unitPriceHt2 === "number" ? product.unitPriceHt2 : null,
    price3: typeof product.unitPriceHt3 === "number" ? product.unitPriceHt3 : null,
    variants: buildProductVariants(product),
  }));
}

export async function fetchOrderInventory(supplierId: string): Promise<OrderStockMap> {
  if (!supplierEnforcesStock(supplierId)) {
    return {};
  }
  const data = await apiClient.get<OrderInventoryLine[]>(
    `/inventory?supplierId=${encodeURIComponent(supplierId)}`,
  );
  if (!Array.isArray(data)) return {};
  const map: OrderStockMap = {};
  for (const row of data) {
    if (row?.id !== null && row?.id !== undefined) {
      map[String(row.id)] = Number.isFinite(row.stock) ? Number(row.stock) : 0;
    }
  }
  return map;
}

export function getOrderProductName(product: OrderProduct, lang: string): string {
  if (lang === "zh") {
    return product.nameCn ?? "—";
  }

  return product.nameFr || product.nameCn || "—";
}

export function getOrderProductUnit(product: OrderProduct): string {
  return product.unit || product.specification || "—";
}

export function getOrderProductVariants(product: OrderProduct): OrderProductVariant[] {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants;
  }

  return [
    {
      id: `${product.id}:1`,
      specification: product.specification || null,
      unit: product.unit || null,
      price: Number.isFinite(product.price) ? product.price : null,
    },
  ];
}

import { Directory, File, Paths } from "expo-file-system";
import { getAccessToken } from "@zhao/api";
import { mobileApiClient } from "@/lib/api";
import { MOBILE_API_URL } from "@/lib/env";
import { secureTokenStorage } from "@/lib/tokenStorage";
import type {
  CreateOrderItem,
  OrderDetail,
  OrderHistoryItem,
  OrderInventoryLine,
  OrderProduct,
  OrderProductApiRecord,
  OrderProductVariant,
  OrderStockMap,
  OrderSupplier,
  PurchaseOrder,
  QuantityMap,
} from "@/features/orders/orderTypes";

const STOCK_ENFORCED_SUPPLIER_IDS = new Set<string>(["8"]);

export function supplierEnforcesStock(
  supplierId: number | string | null | undefined,
): boolean {
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

  return variantFields
    .filter(
      (variant) =>
        variant.specification ||
        variant.unit ||
        Number.isFinite(variant.price),
    )
    .map((variant) => ({
      id: `${product.id}:${variant.key}`,
      specification: variant.specification || null,
      unit: variant.unit || null,
      price: Number.isFinite(variant.price) ? Number(variant.price) : null,
    }));
}

function parseVariantId(variantId: string): CreateOrderItem {
  const [productId, slot] = String(variantId).split(":");
  const specificationSlot = Number(slot);

  return {
    productId: Number(productId),
    ...(Number.isInteger(specificationSlot)
      ? { specificationSlot }
      : {}),
    quantity: 0,
  };
}

export function buildCreateOrderItems(quantities: QuantityMap): CreateOrderItem[] {
  return Object.entries(quantities)
    .map(([variantId, quantity]) => {
      const parsedItem = parseVariantId(variantId);
      const parsedQuantity = Number(quantity) || 0;

      return {
        ...parsedItem,
        quantity: parsedQuantity,
      };
    })
    .filter(
      (item) =>
        Number.isInteger(item.productId) &&
        item.productId > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
}

export async function fetchOrderSuppliers(): Promise<OrderSupplier[]> {
  const suppliers = await mobileApiClient.get<OrderSupplier[]>("/suppliers");

  if (!Array.isArray(suppliers)) {
    return [];
  }

  return suppliers.map((supplier) => ({
    id: String(supplier.id),
    name: supplier.name,
    sortOrder: supplier.sortOrder,
    includeAllProductsInOrder: supplier.includeAllProductsInOrder,
  }));
}

export async function fetchOrderProducts(supplierId: string): Promise<OrderProduct[]> {
  const products = await mobileApiClient.get<OrderProductApiRecord[]>(
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
    image: product.image,
    unit: product.unit,
    price: typeof product.unitPriceHt === "number" ? product.unitPriceHt : null,
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

  const data = await mobileApiClient.get<OrderInventoryLine[]>(
    `/inventory?supplierId=${encodeURIComponent(supplierId)}`,
  );

  return Array.isArray(data)
    ? data.reduce<OrderStockMap>((stockMap, line) => {
        stockMap[String(line.id)] = Number(line.stock) || 0;
        return stockMap;
      }, {})
    : {};
}

export async function createPurchaseOrder(
  deliveryDate: string,
  quantities: QuantityMap,
): Promise<PurchaseOrder> {
  return mobileApiClient.post<PurchaseOrder>("/orders", {
    deliveryDate,
    items: buildCreateOrderItems(quantities),
  });
}

export async function fetchOrderHistory(): Promise<OrderHistoryItem[]> {
  const orders = await mobileApiClient.get<OrderHistoryItem[]>("/orders");

  return Array.isArray(orders) ? orders : [];
}

export async function fetchOrderDetail(orderId: number | string): Promise<OrderDetail> {
  return mobileApiClient.get<OrderDetail>(`/orders/${encodeURIComponent(String(orderId))}`);
}

export async function updatePurchaseOrder(
  orderId: number | string,
  deliveryDate: string,
  quantities: QuantityMap,
): Promise<PurchaseOrder> {
  return mobileApiClient.patch<PurchaseOrder>(
    `/orders/${encodeURIComponent(String(orderId))}`,
    {
      deliveryDate,
      items: buildCreateOrderItems(quantities),
    },
  );
}

export async function downloadOrderPdfToCache(
  pdfUrl: string,
  fileName: string | null | undefined,
): Promise<string> {
  const accessToken = getAccessToken() || (await secureTokenStorage.getAccessToken());

  if (!accessToken) {
    throw new Error("ACCESS_TOKEN_REQUIRED");
  }

  const shareDirectory = new Directory(Paths.cache, buildOrderPdfCacheDirectoryName());
  shareDirectory.create({ idempotent: true, intermediates: true });

  const file = new File(shareDirectory, buildOrderPdfFileName(fileName));
  const downloadedFile = await File.downloadFileAsync(resolveOrderPdfUrl(pdfUrl), file, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    idempotent: true,
  });

  return downloadedFile.uri;
}

export function getOrderProductName(product: OrderProduct, language: string): string {
  if (language === "zh") {
    return product.nameCn || product.nameFr || "-";
  }

  return product.nameFr || product.nameCn || "-";
}

export function getOrderProductVariants(product: OrderProduct): OrderProductVariant[] {
  return product.variants.length > 0
    ? product.variants
    : [
        {
          id: `${product.id}:1`,
          specification: product.specification || null,
          unit: product.unit || null,
          price: product.price,
        },
      ];
}

export function resolveOrderPdfUrl(pdfUrl: string): string {
  if (/^https?:\/\//i.test(pdfUrl)) {
    return normalizeOrderPdfProtocol(pdfUrl);
  }

  return new URL(pdfUrl, MOBILE_API_URL).toString();
}

function normalizeOrderPdfProtocol(pdfUrl: string): string {
  try {
    const orderPdfUrl = new URL(pdfUrl);
    const apiUrl = new URL(MOBILE_API_URL);
    const apiUsesHttps = apiUrl.protocol === "https:";
    const sameApiHost = orderPdfUrl.host === apiUrl.host;

    if (apiUsesHttps && sameApiHost && orderPdfUrl.protocol === "http:") {
      orderPdfUrl.protocol = "https:";
    }

    return orderPdfUrl.toString();
  } catch {
    return pdfUrl;
  }
}

function buildOrderPdfCacheDirectoryName(): string {
  return `order-pdf-share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildOrderPdfFileName(fileName: string | null | undefined): string {
  const safeFileName = (fileName || "commande")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[/\\?%*:|"<>]+/g, "-")
    .replace(/[^a-zA-Z0-9\u3400-\u9FFF._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeFileName || "commande"}.pdf`;
}

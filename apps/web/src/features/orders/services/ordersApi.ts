import { apiClient } from "@/shared/api/api-client";
import type {
  CreateOrderItem,
  CreatePurchaseOrderInput,
  CreatePurchaseReturnInput,
  PurchaseOrder,
  PurchaseReturn,
  QuantityMap,
} from "@/features/orders/types/order";

function parseVariantId(variantId: string): {
  productId: number;
  specificationSlot: number;
} {
  const [productId, slot] = String(variantId).split(":");

  return {
    productId: Number(productId),
    specificationSlot: Number(slot),
  };
}

export function buildCreateOrderItems(quantities: QuantityMap): CreateOrderItem[] {
  return Object.entries(quantities)
    .map(([variantId, quantity]) => {
      const parsedQuantity = Number(quantity) || 0;
      const { productId, specificationSlot } = parseVariantId(variantId);

      return {
        productId,
        quantity: parsedQuantity,
        ...(Number.isInteger(specificationSlot)
          ? { specificationSlot }
          : {}),
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

export async function createPurchaseOrder({
  deliveryDate,
  quantities,
}: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
  return apiClient.post<PurchaseOrder>("/orders", {
    deliveryDate,
    items: buildCreateOrderItems(quantities),
  });
}

export async function fetchPurchaseOrder(orderId: string): Promise<PurchaseOrder> {
  return apiClient.get<PurchaseOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export async function updatePurchaseOrder(
  orderId: string,
  { deliveryDate, quantities }: CreatePurchaseOrderInput,
): Promise<PurchaseOrder> {
  return apiClient.patch<PurchaseOrder>(`/orders/${encodeURIComponent(orderId)}`, {
    deliveryDate,
    items: buildCreateOrderItems(quantities),
  });
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const orders = await apiClient.get<PurchaseOrder[]>("/orders");

  return Array.isArray(orders) ? orders : [];
}

export async function fetchPurchaseOrderPdf(orderId: string): Promise<Blob> {
  return apiClient.get<Blob>(`/orders/${encodeURIComponent(orderId)}/commande`, {
    responseType: "blob",
  });
}

export async function fetchPurchaseReturns(): Promise<PurchaseReturn[]> {
  const returns = await apiClient.get<PurchaseReturn[]>("/orders/returns");

  return Array.isArray(returns) ? returns : [];
}

export async function fetchOrderReturnDraft(orderId: string): Promise<unknown> {
  return apiClient.get(`/orders/${encodeURIComponent(orderId)}/return-draft`);
}

export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput,
): Promise<PurchaseReturn> {
  return apiClient.post<PurchaseReturn>("/orders/returns", input);
}

export async function deletePurchaseOrder(orderId: string): Promise<void> {
  await apiClient.delete(`/orders/${encodeURIComponent(orderId)}`);
}

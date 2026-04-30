import { apiClient } from "@/shared/api/api-client";

function parseVariantId(variantId) {
  const [productId, slot] = String(variantId).split(":");

  return {
    productId: Number(productId),
    specificationSlot: Number(slot),
  };
}

export function buildCreateOrderItems(quantities) {
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

export async function createPurchaseOrder({ deliveryDate, quantities }) {
  return apiClient.post("/orders", {
    deliveryDate,
    items: buildCreateOrderItems(quantities),
  });
}

export async function fetchPurchaseOrders() {
  const orders = await apiClient.get("/orders");

  return Array.isArray(orders) ? orders : [];
}

export async function fetchPurchaseReturns() {
  const returns = await apiClient.get("/orders/returns");

  return Array.isArray(returns) ? returns : [];
}

export async function fetchOrderReturnDraft(orderId) {
  return apiClient.get(`/orders/${encodeURIComponent(orderId)}/return-draft`);
}

export async function createPurchaseReturn(input) {
  return apiClient.post("/orders/returns", input);
}

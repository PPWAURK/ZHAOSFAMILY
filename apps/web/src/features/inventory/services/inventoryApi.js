import { apiClient } from "@/shared/api/api-client";

function normalizeLine(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    supplierId: Number(raw.supplierId),
    reference: raw.reference ?? "",
    category: raw.category ?? "",
    nameCn: raw.nameCn ?? "",
    designationFr: raw.designationFr ?? "",
    unit: raw.unit ?? "",
    specification: raw.specification ?? "",
    stock: Number.isFinite(raw.stock) ? raw.stock : 0,
  };
}

function normalizeMovement(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    productId: String(raw.productId),
    productNameCn: raw.productNameCn ?? "",
    productDesignationFr: raw.productDesignationFr ?? "",
    delta: Number(raw.delta) || 0,
    reason: raw.reason ?? "",
    source: raw.source || "manual",
    sourceId: raw.sourceId ?? "",
    userId: raw.userId ?? null,
    createdAt: raw.createdAt,
  };
}

export async function fetchInventory(supplierId) {
  const data = await apiClient.get(
    `/inventory?supplierId=${encodeURIComponent(supplierId)}`,
  );
  return Array.isArray(data) ? data.map(normalizeLine).filter(Boolean) : [];
}

export async function fetchMovements({ supplierId, productId, limit = 50 }) {
  const params = new URLSearchParams();
  if (supplierId) params.set("supplierId", String(supplierId));
  if (productId) params.set("productId", String(productId));
  params.set("limit", String(limit));
  const data = await apiClient.get(`/inventory/movements?${params.toString()}`);
  return Array.isArray(data) ? data.map(normalizeMovement).filter(Boolean) : [];
}

export async function createMovement({ productId, delta, reason, source, sourceId }) {
  const body = {
    productId: Number(productId),
    delta: Number(delta),
  };
  if (reason !== undefined && reason !== "") body.reason = reason;
  if (source !== undefined) body.source = source;
  if (sourceId !== undefined && sourceId !== "") body.sourceId = sourceId;
  const data = await apiClient.post("/inventory/movements", body);
  return normalizeMovement(data);
}

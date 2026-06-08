import { apiClient } from "@/shared/api/api-client";
import { isDefined } from "@/shared/utils/typeGuards";
import type {
  CreateInventoryMovementInput,
  InventoryApiRecord,
  InventoryLine,
  InventoryMovement,
  InventoryMovementApiRecord,
  InventoryMovementFilters,
} from "@/features/inventory/types/inventory";

function normalizeLine(raw: InventoryApiRecord | null): InventoryLine | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    supplierId: Number(raw.supplierId),
    reference: raw.reference ?? "",
    category: raw.category ?? "",
    nameCn: raw.nameCn ?? "",
    designationFr: raw.designationFr ?? "",
    image: raw.image ?? "",
    unit: raw.unit ?? "",
    specification: raw.specification ?? "",
    stock: Number.isFinite(raw.stock) ? Number(raw.stock) : 0,
  };
}

function normalizeMovement(
  raw: InventoryMovementApiRecord | null,
): InventoryMovement | null {
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

export async function fetchInventory(supplierId: string): Promise<InventoryLine[]> {
  const data = await apiClient.get<InventoryApiRecord[]>(
    `/inventory?supplierId=${encodeURIComponent(supplierId)}`,
  );
  return Array.isArray(data) ? data.map(normalizeLine).filter(isDefined) : [];
}

export async function fetchMovements({
  supplierId,
  productId,
  limit = 50,
}: InventoryMovementFilters): Promise<InventoryMovement[]> {
  const params = new URLSearchParams();
  if (supplierId) params.set("supplierId", String(supplierId));
  if (productId) params.set("productId", String(productId));
  params.set("limit", String(limit));
  const data = await apiClient.get<InventoryMovementApiRecord[]>(
    `/inventory/movements?${params.toString()}`,
  );
  return Array.isArray(data) ? data.map(normalizeMovement).filter(isDefined) : [];
}

export async function createMovement({
  productId,
  delta,
  reason,
  source,
  sourceId,
}: CreateInventoryMovementInput): Promise<InventoryMovement | null> {
  const body: Record<string, unknown> = {
    productId: Number(productId),
    delta: Number(delta),
  };
  if (reason !== undefined && reason !== "") body.reason = reason;
  if (source !== undefined) body.source = source;
  if (sourceId !== undefined && sourceId !== "") body.sourceId = sourceId;
  const data = await apiClient.post<InventoryMovementApiRecord>(
    "/inventory/movements",
    body,
  );
  return normalizeMovement(data);
}

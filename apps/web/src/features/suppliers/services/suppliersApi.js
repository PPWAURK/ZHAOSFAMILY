import { apiClient } from "@/shared/api/api-client";

function normalizeSupplier(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    numericId: Number(raw.id),
    name: raw.name ?? "",
    sortOrder: Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    includeAllProductsInOrder: !!raw.includeAllProductsInOrder,
  };
}

function normalizeProduct(raw) {
  if (!raw) return null;
  return {
    id: String(raw.id),
    supplierId: Number(raw.supplierId),
    reference: raw.reference ?? "",
    category: raw.category ?? "",
    nameCn: raw.nameCn ?? "",
    designationFr: raw.designationFr ?? "",
    unit: raw.unit ?? "",
    price:
      typeof raw.unitPriceHt === "number" && Number.isFinite(raw.unitPriceHt)
        ? raw.unitPriceHt
        : 0,
    image: raw.image ?? "",
    specification: raw.specification ?? "",
  };
}

export async function fetchSuppliers() {
  const data = await apiClient.get("/suppliers");
  return Array.isArray(data) ? data.map(normalizeSupplier).filter(Boolean) : [];
}

export async function fetchSupplier(id) {
  const data = await apiClient.get(`/suppliers/${encodeURIComponent(id)}`);
  return normalizeSupplier(data);
}

export async function createSupplierApi(input) {
  const body = {
    name: input.name,
    includeAllProductsInOrder: !!input.includeAllProductsInOrder,
  };
  if (Number.isFinite(input.sortOrder)) body.sortOrder = input.sortOrder;
  const data = await apiClient.post("/suppliers", body);
  return normalizeSupplier(data);
}

export async function updateSupplierApi(id, patch) {
  const body = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.sortOrder !== undefined && Number.isFinite(patch.sortOrder))
    body.sortOrder = patch.sortOrder;
  if (patch.includeAllProductsInOrder !== undefined)
    body.includeAllProductsInOrder = !!patch.includeAllProductsInOrder;
  const data = await apiClient.patch(`/suppliers/${encodeURIComponent(id)}`, body);
  return normalizeSupplier(data);
}

export async function deleteSupplierApi(id) {
  await apiClient.delete(`/suppliers/${encodeURIComponent(id)}`);
}

export async function fetchProductsBySupplier(supplierId) {
  const data = await apiClient.get(
    `/products?supplierId=${encodeURIComponent(supplierId)}`,
  );
  return Array.isArray(data) ? data.map(normalizeProduct).filter(Boolean) : [];
}

export async function createProductApi(supplierId, input) {
  const body = {
    supplierId: Number(supplierId),
    category: input.category || "",
    nameCn: input.nameCn || "",
  };
  if (input.reference !== undefined) body.reference = input.reference || "";
  if (input.designationFr !== undefined)
    body.designationFr = input.designationFr || "";
  if (input.unit !== undefined) body.unit = input.unit || "";
  if (input.specification !== undefined)
    body.specification = input.specification || "";
  if (input.image !== undefined) body.image = input.image || "";
  if (input.price !== undefined && Number.isFinite(Number(input.price))) {
    body.unitPriceHt = Number(input.price);
  }
  const data = await apiClient.post("/products", body);
  return normalizeProduct(data);
}

export async function updateProductApi(productId, input) {
  const body = {};
  if (input.reference !== undefined) body.reference = input.reference || "";
  if (input.category !== undefined) body.category = input.category || "";
  if (input.nameCn !== undefined) body.nameCn = input.nameCn || "";
  if (input.designationFr !== undefined)
    body.designationFr = input.designationFr || "";
  if (input.unit !== undefined) body.unit = input.unit || "";
  if (input.specification !== undefined)
    body.specification = input.specification || "";
  if (input.image !== undefined) body.image = input.image || "";
  if (input.price !== undefined && Number.isFinite(Number(input.price))) {
    body.unitPriceHt = Number(input.price);
  }
  const data = await apiClient.patch(
    `/products/${encodeURIComponent(productId)}`,
    body,
  );
  return normalizeProduct(data);
}

export async function deleteProductApi(productId) {
  await apiClient.delete(`/products/${encodeURIComponent(productId)}`);
}

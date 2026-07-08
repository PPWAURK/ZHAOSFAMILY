import { ApiClientError, apiClient, buildMediaFileUrl } from "@/shared/api/api-client";
import { isDefined } from "@/shared/utils/typeGuards";
import { createProductsApi, createSuppliersApi } from "@zhao/api";
import type {
  CreateProductRequest,
  CreateSupplierRequest,
  ProductSummary as ProductApiRecord,
  SupplierSummary as SupplierApiRecord,
  UpdateProductRequest,
} from "@zhao/types";
import type {
  SupplierInput,
  SupplierPatch,
  SupplierProduct,
  SupplierProductInput,
  SupplierSummary,
} from "@/features/suppliers/types/supplier";

const suppliersApi = createSuppliersApi(apiClient);
const productsApi = createProductsApi(apiClient);

type ProductImageUploadResult = {
  objectKey?: string;
};

function normalizeSupplier(raw: SupplierApiRecord | null): SupplierSummary | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    numericId: Number(raw.id),
    name: raw.name ?? "",
    sortOrder: Number.isFinite(raw.sortOrder) ? Number(raw.sortOrder) : 0,
    includeAllProductsInOrder: !!raw.includeAllProductsInOrder,
    orderNotice: raw.orderNotice ?? "",
  };
}

function normalizeProduct(raw: ProductApiRecord | null): SupplierProduct | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    supplierId: Number(raw.supplierId),
    isActive: raw.isActive !== false,
    reference: raw.reference ?? "",
    category: raw.category ?? "",
    nameCn: raw.nameCn ?? "",
    designationFr: raw.designationFr ?? "",
    unit: raw.unit ?? "",
    price:
      typeof raw.unitPriceHt === "number" && Number.isFinite(raw.unitPriceHt) ? raw.unitPriceHt : 0,
    image: raw.image ?? "",
    specification: raw.specification ?? "",
  };
}

export async function fetchSuppliers(): Promise<SupplierSummary[]> {
  const data = await suppliersApi.list();
  return Array.isArray(data) ? data.map(normalizeSupplier).filter(isDefined) : [];
}

export async function fetchSupplier(id: string): Promise<SupplierSummary | null> {
  try {
    const data = await suppliersApi.getById(id);
    return normalizeSupplier(data);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createSupplierApi(input: SupplierInput): Promise<SupplierSummary | null> {
  const body: CreateSupplierRequest = {
    name: input.name,
    includeAllProductsInOrder: !!input.includeAllProductsInOrder,
  };
  if (Number.isFinite(input.sortOrder)) body.sortOrder = input.sortOrder;
  if (input.orderNotice !== undefined) body.orderNotice = input.orderNotice;
  const data = await suppliersApi.create(body);
  return normalizeSupplier(data);
}

export async function updateSupplierApi(
  id: string,
  patch: SupplierPatch,
): Promise<SupplierSummary | null> {
  const body: SupplierPatch = {};
  if (patch.name !== undefined) body.name = patch.name;
  if (patch.sortOrder !== undefined && Number.isFinite(patch.sortOrder))
    body.sortOrder = patch.sortOrder;
  if (patch.includeAllProductsInOrder !== undefined)
    body.includeAllProductsInOrder = !!patch.includeAllProductsInOrder;
  if (patch.orderNotice !== undefined) body.orderNotice = patch.orderNotice;
  const data = await suppliersApi.update(id, body);
  return normalizeSupplier(data);
}

export async function deleteSupplierApi(id: string): Promise<void> {
  await suppliersApi.remove(id);
}

export async function fetchProductsBySupplier(supplierId: string): Promise<SupplierProduct[]> {
  // Management view shows off-shelf products too, so they can be re-listed.
  const data = await productsApi.list({
    supplierId: Number(supplierId),
    includeInactive: true,
  });
  return Array.isArray(data) ? data.map(normalizeProduct).filter(isDefined) : [];
}

export async function createProductApi(
  supplierId: string,
  input: SupplierProductInput,
): Promise<SupplierProduct | null> {
  const body: CreateProductRequest = {
    supplierId: Number(supplierId),
    category: input.category || "",
    nameCn: input.nameCn || "",
  };
  if (input.reference !== undefined) body.reference = input.reference || "";
  if (input.designationFr !== undefined) body.designationFr = input.designationFr || "";
  if (input.unit !== undefined) body.unit = input.unit || "";
  if (input.specification !== undefined) body.specification = input.specification || "";
  if (input.image !== undefined) body.image = input.image || "";
  if (input.price !== undefined && Number.isFinite(Number(input.price))) {
    body.unitPriceHt = Number(input.price);
  }
  const data = await productsApi.create(body);
  return normalizeProduct(data);
}

export async function updateProductApi(
  productId: string,
  input: SupplierProductInput,
): Promise<SupplierProduct | null> {
  const body: UpdateProductRequest = {};
  if (input.isActive !== undefined) body.isActive = input.isActive;
  if (input.reference !== undefined) body.reference = input.reference || "";
  if (input.category !== undefined) body.category = input.category || "";
  if (input.nameCn !== undefined) body.nameCn = input.nameCn || "";
  if (input.designationFr !== undefined) body.designationFr = input.designationFr || "";
  if (input.unit !== undefined) body.unit = input.unit || "";
  if (input.specification !== undefined) body.specification = input.specification || "";
  if (input.image !== undefined) body.image = input.image || "";
  if (input.price !== undefined && Number.isFinite(Number(input.price))) {
    body.unitPriceHt = Number(input.price);
  }
  const data = await productsApi.update(productId, body);
  return normalizeProduct(data);
}

export async function deleteProductApi(productId: string): Promise<void> {
  await productsApi.remove(productId);
}

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "suppliers/products");

  const uploaded = await apiClient.upload<ProductImageUploadResult>("/media/upload", formData);

  if (!uploaded.objectKey) {
    throw new Error("PRODUCT_IMAGE_UPLOAD_MISSING_OBJECT_KEY");
  }

  return buildMediaFileUrl(uploaded.objectKey);
}

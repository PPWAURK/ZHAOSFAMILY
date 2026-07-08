import type {
  CreateProductRequest,
  ListProductsQuery,
  ProductDetail,
  ProductSummary,
  UpdateProductRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type ProductsApi = {
  list: (query: ListProductsQuery) => Promise<ProductSummary[]>;
  getById: (id: string) => Promise<ProductDetail>;
  create: (input: CreateProductRequest) => Promise<ProductDetail>;
  update: (id: string, input: UpdateProductRequest) => Promise<ProductDetail>;
  remove: (id: string) => Promise<void>;
};

function buildProductsPath(query: ListProductsQuery): string {
  const params = new URLSearchParams({
    supplierId: String(query.supplierId),
  });
  if (query.includeInactive) {
    params.set("includeInactive", "true");
  }

  return `/products?${params.toString()}`;
}

export function createProductsApi(apiClient: ApiClient): ProductsApi {
  return {
    list: (query) => apiClient.get<ProductSummary[]>(buildProductsPath(query)),
    getById: (id) => apiClient.get<ProductDetail>(`/products/${encodeURIComponent(id)}`),
    create: (input) => apiClient.post<ProductDetail>("/products", input),
    update: (id, input) =>
      apiClient.patch<ProductDetail>(`/products/${encodeURIComponent(id)}`, input),
    remove: (id) => apiClient.delete<void>(`/products/${encodeURIComponent(id)}`),
  };
}

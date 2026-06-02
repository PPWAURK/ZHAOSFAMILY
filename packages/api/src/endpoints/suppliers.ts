import type {
  CreateSupplierRequest,
  SupplierDetail,
  SupplierSummary,
  UpdateSupplierRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type SuppliersApi = {
  list: () => Promise<SupplierSummary[]>;
  getById: (id: number | string) => Promise<SupplierDetail>;
  create: (input: CreateSupplierRequest) => Promise<SupplierDetail>;
  update: (id: number | string, input: UpdateSupplierRequest) => Promise<SupplierDetail>;
  remove: (id: number | string) => Promise<void>;
};

export function createSuppliersApi(apiClient: ApiClient): SuppliersApi {
  return {
    list: () => apiClient.get<SupplierSummary[]>("/suppliers"),
    getById: (id) => apiClient.get<SupplierDetail>(`/suppliers/${encodeURIComponent(id)}`),
    create: (input) => apiClient.post<SupplierDetail>("/suppliers", input),
    update: (id, input) =>
      apiClient.patch<SupplierDetail>(`/suppliers/${encodeURIComponent(id)}`, input),
    remove: (id) => apiClient.delete<void>(`/suppliers/${encodeURIComponent(id)}`),
  };
}


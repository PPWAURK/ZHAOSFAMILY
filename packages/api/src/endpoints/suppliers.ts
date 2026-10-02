import type {
  CreateSupplierRequest,
  SupplierAvailability,
  SupplierDetail,
  SupplierSummary,
  UpdateSupplierAvailabilityRequest,
  UpdateSupplierRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type SuppliersApi = {
  list: () => Promise<SupplierSummary[]>;
  listOrderable: () => Promise<SupplierSummary[]>;
  getById: (id: number | string) => Promise<SupplierDetail>;
  getAvailability: (id: number | string) => Promise<SupplierAvailability>;
  create: (input: CreateSupplierRequest) => Promise<SupplierDetail>;
  update: (id: number | string, input: UpdateSupplierRequest) => Promise<SupplierDetail>;
  updateAvailability: (
    id: number | string,
    input: UpdateSupplierAvailabilityRequest,
  ) => Promise<SupplierAvailability>;
  remove: (id: number | string) => Promise<void>;
};

export function createSuppliersApi(apiClient: ApiClient): SuppliersApi {
  return {
    list: () => apiClient.get<SupplierSummary[]>("/suppliers"),
    listOrderable: () => apiClient.get<SupplierSummary[]>("/suppliers/orderable"),
    getById: (id) => apiClient.get<SupplierDetail>(`/suppliers/${encodeURIComponent(id)}`),
    getAvailability: (id) =>
      apiClient.get<SupplierAvailability>(`/suppliers/${encodeURIComponent(id)}/availability`),
    create: (input) => apiClient.post<SupplierDetail>("/suppliers", input),
    update: (id, input) =>
      apiClient.patch<SupplierDetail>(`/suppliers/${encodeURIComponent(id)}`, input),
    updateAvailability: (id, input) =>
      apiClient.put<SupplierAvailability>(
        `/suppliers/${encodeURIComponent(id)}/availability`,
        input,
      ),
    remove: (id) => apiClient.delete<void>(`/suppliers/${encodeURIComponent(id)}`),
  };
}

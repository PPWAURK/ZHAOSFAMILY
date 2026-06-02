import type {
  CreateRestaurantRequest,
  RestaurantDetail,
  RestaurantSummary,
  UpdateRestaurantRequest,
} from "@zhao/types";
import type { ApiClient } from "../client";

export type RestaurantsApi = {
  list: () => Promise<RestaurantSummary[]>;
  getById: (id: number | string) => Promise<RestaurantDetail>;
  create: (input: CreateRestaurantRequest) => Promise<RestaurantDetail>;
  update: (id: number | string, input: UpdateRestaurantRequest) => Promise<RestaurantDetail>;
  remove: (id: number | string) => Promise<void>;
};

export function createRestaurantsApi(apiClient: ApiClient): RestaurantsApi {
  return {
    list: () => apiClient.get<RestaurantSummary[]>("/restaurants"),
    getById: (id) => apiClient.get<RestaurantDetail>(`/restaurants/${encodeURIComponent(id)}`),
    create: (input) => apiClient.post<RestaurantDetail>("/restaurants", input),
    update: (id, input) =>
      apiClient.patch<RestaurantDetail>(`/restaurants/${encodeURIComponent(id)}`, input),
    remove: (id) => apiClient.delete<void>(`/restaurants/${encodeURIComponent(id)}`),
  };
}


import { apiClient, buildPublicStorePhotoUrl } from "@/shared/api/api-client";
import { createRestaurantsApi } from "@zhao/api";
import { fetchManageableRestaurants } from "@/features/permissions/services/permissionsApi";
import type {
  RestaurantApiRecord,
  StoreCardModel,
  StoreFormInput,
  StoreOption,
} from "@/features/stores/types/store";

const DEFAULT_STORE_PHOTO = "/logo2024/logo2024.jpg";
const restaurantsApi = createRestaurantsApi(apiClient);

type StorePhotoUploadResult = {
  objectKey?: string;
};

export function formatStoreCode(storeCode: number | string): string {
  return `STORE ${String(storeCode).padStart(3, "0")}`;
}

export function resolveStorePhotoPath(photoObjectKey?: string | null): string {
  if (!photoObjectKey) {
    return DEFAULT_STORE_PHOTO;
  }

  return buildPublicStorePhotoUrl(photoObjectKey);
}

export async function fetchRestaurants(): Promise<RestaurantApiRecord[]> {
  const restaurants = await restaurantsApi.list();
  return Array.isArray(restaurants) ? restaurants : [];
}

export function mapRestaurantToStoreOption(restaurant: RestaurantApiRecord): StoreOption {
  return {
    id: String(restaurant.id),
    name: restaurant.name ?? "",
    address: restaurant.address ?? "",
    storeCode: formatStoreCode(restaurant.storeCode),
    photoPath: resolveStorePhotoPath(restaurant.photoObjectKey),
    photoObjectKey: restaurant.photoObjectKey ?? "",
  };
}

export function mapRestaurantToStoreCard(restaurant: RestaurantApiRecord): StoreCardModel {
  return {
    id: String(restaurant.id),
    name: restaurant.name ?? "",
    address: restaurant.address ?? "",
    status: "open",
    storeCode: formatStoreCode(restaurant.storeCode),
    photoPath: resolveStorePhotoPath(restaurant.photoObjectKey),
    photoObjectKey: restaurant.photoObjectKey ?? "",
  };
}

export async function fetchRegisterStores(): Promise<StoreOption[]> {
  const restaurants = await fetchRestaurants();
  return restaurants.map(mapRestaurantToStoreOption);
}

export async function fetchStoresPageStores(): Promise<StoreCardModel[]> {
  const restaurants = await fetchManageableRestaurants();
  return restaurants.map(mapRestaurantToStoreCard);
}

export async function createRestaurant(input: StoreFormInput): Promise<StoreCardModel> {
  const restaurant = await restaurantsApi.create({
    name: input.name,
    address: input.address,
    photoObjectKey: input.photoObjectKey || undefined,
  });

  return mapRestaurantToStoreCard(restaurant);
}

export async function updateRestaurant(id: string, input: StoreFormInput): Promise<StoreCardModel> {
  const restaurant = await restaurantsApi.update(id, {
    name: input.name,
    address: input.address,
    photoObjectKey: input.photoObjectKey || null,
  });

  return mapRestaurantToStoreCard(restaurant);
}

export async function deleteRestaurant(id: string): Promise<void> {
  await restaurantsApi.remove(id);
}

export async function uploadStorePhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "stores/photos");

  const uploaded = await apiClient.upload<StorePhotoUploadResult>("/media/upload", formData);

  if (!uploaded.objectKey) {
    throw new Error("STORE_PHOTO_UPLOAD_MISSING_OBJECT_KEY");
  }

  return uploaded.objectKey;
}

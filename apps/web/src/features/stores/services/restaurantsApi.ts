import { API_URL, apiClient, buildMediaFileUrl } from "@/shared/api/api-client";
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

export function formatStoreCode(restaurantId: number | string): string {
  return `STORE ${String(restaurantId).padStart(3, "0")}`;
}

function resolveApiOrigin(): string {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = resolveApiOrigin();

export function resolveStorePhotoPath(photoUrl?: string | null): string {
  if (!photoUrl) {
    return DEFAULT_STORE_PHOTO;
  }

  if (/^(https?:)?\/\//i.test(photoUrl) || photoUrl.startsWith("data:")) {
    return photoUrl;
  }

  if (!API_ORIGIN) {
    return photoUrl;
  }

  if (photoUrl.startsWith("/")) {
    return `${API_ORIGIN}${photoUrl}`;
  }

  return `${API_ORIGIN}/${photoUrl.replace(/^\/+/, "")}`;
}

export async function fetchRestaurants(): Promise<RestaurantApiRecord[]> {
  const restaurants = await restaurantsApi.list();
  return Array.isArray(restaurants) ? restaurants : [];
}

export function mapRestaurantToStoreOption(
  restaurant: RestaurantApiRecord,
): StoreOption {
  return {
    id: String(restaurant.id),
    name: restaurant.name ?? "",
    address: restaurant.address ?? "",
    storeCode: formatStoreCode(restaurant.id),
    photoPath: resolveStorePhotoPath(restaurant.photoUrl),
    photoUrl: restaurant.photoUrl ?? "",
  };
}

export function mapRestaurantToStoreCard(
  restaurant: RestaurantApiRecord,
): StoreCardModel {
  return {
    id: String(restaurant.id),
    name: restaurant.name ?? "",
    address: restaurant.address ?? "",
    status: "open",
    storeCode: formatStoreCode(restaurant.id),
    photoPath: resolveStorePhotoPath(restaurant.photoUrl),
    photoUrl: restaurant.photoUrl ?? "",
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

export async function createRestaurant(
  input: StoreFormInput,
): Promise<StoreCardModel> {
  const restaurant = await restaurantsApi.create({
    name: input.name,
    address: input.address,
    photoUrl: input.photoUrl || undefined,
  });

  return mapRestaurantToStoreCard(restaurant);
}

export async function updateRestaurant(
  id: string,
  input: StoreFormInput,
): Promise<StoreCardModel> {
  const restaurant = await restaurantsApi.update(id, {
    name: input.name,
    address: input.address,
    photoUrl: input.photoUrl || undefined,
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

  const uploaded = await apiClient.upload<StorePhotoUploadResult>(
    "/media/upload",
    formData,
  );

  if (!uploaded.objectKey) {
    throw new Error("STORE_PHOTO_UPLOAD_MISSING_OBJECT_KEY");
  }

  return buildMediaFileUrl(uploaded.objectKey);
}

import { apiClient } from "@/shared/api/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";
const DEFAULT_STORE_PHOTO = "/logo2024/logo2024.jpg";

export function formatStoreCode(restaurantId) {
  return `STORE ${String(restaurantId).padStart(3, "0")}`;
}

function resolveApiOrigin() {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = resolveApiOrigin();

export function resolveStorePhotoPath(photoUrl) {
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

export async function fetchRestaurants() {
  const restaurants = await apiClient.get("/restaurants");
  return Array.isArray(restaurants) ? restaurants : [];
}

export function mapRestaurantToStoreOption(restaurant) {
  return {
    id: String(restaurant.id),
    name: restaurant.name,
    address: restaurant.address,
    storeCode: formatStoreCode(restaurant.id),
    photoPath: resolveStorePhotoPath(restaurant.photoUrl),
  };
}

export function mapRestaurantToStoreCard(restaurant) {
  return {
    id: String(restaurant.id),
    name: restaurant.name,
    address: restaurant.address,
    status: "open",
    storeCode: formatStoreCode(restaurant.id),
    photoPath: resolveStorePhotoPath(restaurant.photoUrl),
  };
}

export async function fetchRegisterStores() {
  const restaurants = await fetchRestaurants();
  return restaurants.map(mapRestaurantToStoreOption);
}

export async function fetchStoresPageStores() {
  const restaurants = await fetchRestaurants();
  return restaurants.map(mapRestaurantToStoreCard);
}

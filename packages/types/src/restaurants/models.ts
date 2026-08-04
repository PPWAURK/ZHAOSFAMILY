export type RestaurantSummary = {
  id: number;
  storeCode: number;
  name: string;
  address: string;
  photoObjectKey: string | null;
};

export type RestaurantDetail = RestaurantSummary;

export type RestaurantResponse = RestaurantSummary;

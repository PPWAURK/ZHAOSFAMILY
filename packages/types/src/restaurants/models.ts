export type RestaurantSummary = {
  id: number;
  name: string;
  address: string;
  photoUrl: string | null;
};

export type RestaurantDetail = RestaurantSummary;

export type RestaurantResponse = RestaurantSummary;

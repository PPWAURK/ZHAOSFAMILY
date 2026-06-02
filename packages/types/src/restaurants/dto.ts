export type CreateRestaurantRequest = {
  name: string;
  address: string;
  photoUrl?: string;
};

export type UpdateRestaurantRequest = Partial<CreateRestaurantRequest>;

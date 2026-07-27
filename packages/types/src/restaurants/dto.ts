export type CreateRestaurantRequest = {
  name: string;
  address: string;
  photoObjectKey?: string;
};

export type UpdateRestaurantRequest = Omit<Partial<CreateRestaurantRequest>, "photoObjectKey"> & {
  photoObjectKey?: string | null;
};

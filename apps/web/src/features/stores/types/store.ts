export type RestaurantApiRecord = {
  id: number | string;
  storeCode: number | string;
  name?: string | null;
  address?: string | null;
  photoObjectKey?: string | null;
};

export type StoreOption = {
  id: string;
  name: string;
  address: string;
  storeCode: string;
  photoPath: string;
  photoObjectKey: string;
};

export type StoreCardModel = StoreOption & {
  status: "open" | "closed";
};

export type StoreFormInput = {
  name: string;
  address: string;
  photoObjectKey: string;
};

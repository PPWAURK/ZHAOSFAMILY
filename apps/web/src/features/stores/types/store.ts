export type RestaurantApiRecord = {
  id: number | string;
  name?: string | null;
  address?: string | null;
  photoUrl?: string | null;
};

export type StoreOption = {
  id: string;
  name: string;
  address: string;
  storeCode: string;
  photoPath: string;
  photoUrl: string;
};

export type StoreCardModel = StoreOption & {
  status: "open" | "closed";
};

export type StoreFormInput = {
  name: string;
  address: string;
  photoUrl: string;
};

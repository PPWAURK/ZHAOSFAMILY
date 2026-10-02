import type { SupplierAvailabilityScope } from "./models";

export type CreateSupplierRequest = {
  name: string;
  sortOrder?: number;
  includeAllProductsInOrder?: boolean;
  orderNotice?: string;
  orderNoticeFr?: string;
};

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export type UpdateSupplierAvailabilityRequest = {
  scope: SupplierAvailabilityScope;
  restaurantIds: number[];
};

export type CreateSupplierRequest = {
  name: string;
  sortOrder?: number;
  includeAllProductsInOrder?: boolean;
  orderNotice?: string;
  orderNoticeFr?: string;
};

export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

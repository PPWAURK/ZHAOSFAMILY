export type ListProductsQuery = {
  supplierId: number;
  includeInactive?: boolean;
};

export type CreateProductRequest = {
  supplierId: number;
  isActive?: boolean;
  reference?: string;
  category: string;
  nameCn: string;
  designationFr?: string;
  unit?: string;
  unitPriceHt?: number;
  image?: string;
  specification?: string;
};

export type UpdateProductRequest = Partial<CreateProductRequest>;

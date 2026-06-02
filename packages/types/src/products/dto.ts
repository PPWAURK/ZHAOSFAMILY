export type ListProductsQuery = {
  supplierId: number;
};

export type CreateProductRequest = {
  supplierId: number;
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


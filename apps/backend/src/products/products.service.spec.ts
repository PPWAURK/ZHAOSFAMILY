import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('returns only on-shelf products for one supplier ordered by id', async () => {
    const prismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: BigInt(4),
            supplierId: 1,
            isActive: true,
            reference: 'VEG-004',
            category: 'frais',
            nameCn: '白萝卜',
            designationFr: 'Choux Shanghai',
            unit: '箱',
            unitPriceHt: { toString: () => '3.30' },
            image: null,
            specification: '8KG',
            specification2: null,
            specification3: null,
            unit2: null,
            unit3: null,
            unitPriceHt2: null,
            unitPriceHt3: null,
          },
        ]),
      },
    };
    const productsService = new ProductsService(prismaService as never);

    const result = await productsService.listProductsBySupplier(1);

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        supplierId: 1,
        isActive: true,
      },
      select: {
        id: true,
        supplierId: true,
        isActive: true,
        reference: true,
        category: true,
        nameCn: true,
        designationFr: true,
        unit: true,
        unitPriceHt: true,
        image: true,
        specification: true,
        specification2: true,
        specification3: true,
        unit2: true,
        unit3: true,
        unitPriceHt2: true,
        unitPriceHt3: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    expect(result).toEqual([
      {
        id: '4',
        supplierId: 1,
        isActive: true,
        reference: 'VEG-004',
        category: 'frais',
        nameCn: '白萝卜',
        designationFr: 'Choux Shanghai',
        unit: '箱',
        unitPriceHt: 3.3,
        image: null,
        specification: '8KG',
        specification2: null,
        specification3: null,
        unit2: null,
        unit3: null,
        unitPriceHt2: null,
        unitPriceHt3: null,
      },
    ]);
  });

  it('includes off-shelf products when includeInactive is set', async () => {
    const prismaService = {
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const productsService = new ProductsService(prismaService as never);

    await productsService.listProductsBySupplier(1, true);

    expect(prismaService.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { supplierId: 1 } }),
    );
  });
});

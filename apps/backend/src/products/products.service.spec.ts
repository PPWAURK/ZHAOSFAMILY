import { ProductsService } from './products.service';

describe('ProductsService', () => {
  it('returns only on-shelf products for one supplier in display order', async () => {
    const prismaService = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: BigInt(4),
            supplierId: 1,
            isActive: true,
            isInStock: true,
            sortOrder: 1,
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
            caseSize: null,
            caseSize2: null,
            caseSize3: null,
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
        isInStock: true,
        sortOrder: true,
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
        caseSize: true,
        caseSize2: true,
        caseSize3: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(result).toEqual([
      {
        id: '4',
        supplierId: 1,
        isActive: true,
        isInStock: true,
        sortOrder: 1,
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
        caseSize: null,
        caseSize2: null,
        caseSize3: null,
      },
    ]);
  });

  it('replaces one supplier product order atomically', async () => {
    const product = {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: BigInt(1) }, { id: BigInt(2) }]),
      update: jest.fn().mockReturnValue(undefined),
    };
    const prismaService = {
      product,
      supplier: {
        findUnique: jest.fn().mockResolvedValue({ id: 1 }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const productsService = new ProductsService(prismaService as never);

    await productsService.reorderProducts({
      supplierId: 1,
      productIds: ['2', '1'],
    });

    expect(product.update).toHaveBeenNthCalledWith(1, {
      where: { id: BigInt(2) },
      data: { sortOrder: 1 },
    });
    expect(product.update).toHaveBeenNthCalledWith(2, {
      where: { id: BigInt(1) },
      data: { sortOrder: 2 },
    });
    expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
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

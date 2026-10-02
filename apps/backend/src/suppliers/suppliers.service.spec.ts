import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';

const SUPPLIER = {
  id: 3,
  name: 'JFC',
  sortOrder: 2,
  includeAllProductsInOrder: false,
  orderNotice: null,
  orderNoticeFr: null,
};

describe('SuppliersService', () => {
  let prismaService: {
    supplier: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    restaurant: { count: jest.Mock };
    $transaction: jest.Mock;
  };
  let transaction: {
    supplier: { update: jest.Mock };
    supplierRestaurantAvailability: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let suppliersService: SuppliersService;

  beforeEach(() => {
    transaction = {
      supplier: { update: jest.fn() },
      supplierRestaurantAvailability: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    prismaService = {
      supplier: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      restaurant: { count: jest.fn() },
      $transaction: jest.fn(
        (callback: (client: typeof transaction) => unknown): unknown =>
          callback(transaction),
      ),
    };
    suppliersService = new SuppliersService(prismaService as never);
  });

  it('returns the suppliers ordered by sort order then id', async () => {
    prismaService.supplier.findMany.mockResolvedValue([SUPPLIER]);

    const result = await suppliersService.listSuppliers();

    expect(prismaService.supplier.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
        orderNotice: true,
        orderNoticeFr: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(result).toEqual([SUPPLIER]);
  });

  it('lists suppliers available globally or to the selected restaurant', async () => {
    prismaService.supplier.findMany.mockResolvedValue([SUPPLIER]);

    await suppliersService.listOrderableSuppliers(12);

    expect(prismaService.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { availableToAllRestaurants: true },
            {
              restaurantAvailabilities: {
                some: { restaurantId: 12 },
              },
            },
          ],
        },
      }),
    );
  });

  it('returns selected restaurant availability in stable order', async () => {
    prismaService.supplier.findUnique.mockResolvedValue({
      id: 3,
      availableToAllRestaurants: false,
      restaurantAvailabilities: [{ restaurantId: 2 }, { restaurantId: 9 }],
    });

    await expect(suppliersService.getSupplierAvailability(3)).resolves.toEqual({
      supplierId: 3,
      scope: 'selected',
      restaurantIds: [2, 9],
    });
  });

  it('returns an empty restaurant list for all-store availability', async () => {
    prismaService.supplier.findUnique.mockResolvedValue({
      id: 3,
      availableToAllRestaurants: true,
      restaurantAvailabilities: [{ restaurantId: 2 }],
    });

    await expect(suppliersService.getSupplierAvailability(3)).resolves.toEqual({
      supplierId: 3,
      scope: 'all',
      restaurantIds: [],
    });
  });

  it('replaces selected restaurant availability in one transaction', async () => {
    prismaService.supplier.findUnique.mockResolvedValue(SUPPLIER);
    prismaService.restaurant.count.mockResolvedValue(2);

    const result = await suppliersService.updateSupplierAvailability(3, {
      scope: 'selected',
      restaurantIds: [2, 9],
    });

    expect(transaction.supplier.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { availableToAllRestaurants: false },
    });
    expect(
      transaction.supplierRestaurantAvailability.deleteMany,
    ).toHaveBeenCalledWith({ where: { supplierId: 3 } });
    expect(
      transaction.supplierRestaurantAvailability.createMany,
    ).toHaveBeenCalledWith({
      data: [
        { supplierId: 3, restaurantId: 2 },
        { supplierId: 3, restaurantId: 9 },
      ],
    });
    expect(result).toEqual({
      supplierId: 3,
      scope: 'selected',
      restaurantIds: [2, 9],
    });
  });

  it('supports an empty selected restaurant list', async () => {
    prismaService.supplier.findUnique.mockResolvedValue(SUPPLIER);

    const result = await suppliersService.updateSupplierAvailability(3, {
      scope: 'selected',
      restaurantIds: [],
    });

    expect(transaction.supplier.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { availableToAllRestaurants: false },
    });
    expect(
      transaction.supplierRestaurantAvailability.deleteMany,
    ).toHaveBeenCalledWith({ where: { supplierId: 3 } });
    expect(
      transaction.supplierRestaurantAvailability.createMany,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      supplierId: 3,
      scope: 'selected',
      restaurantIds: [],
    });
  });

  it('clears selected restaurants when enabling all-store availability', async () => {
    prismaService.supplier.findUnique.mockResolvedValue(SUPPLIER);

    const result = await suppliersService.updateSupplierAvailability(3, {
      scope: 'all',
      restaurantIds: [],
    });

    expect(transaction.supplier.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { availableToAllRestaurants: true },
    });
    expect(
      transaction.supplierRestaurantAvailability.deleteMany,
    ).toHaveBeenCalledWith({ where: { supplierId: 3 } });
    expect(result).toEqual({
      supplierId: 3,
      scope: 'all',
      restaurantIds: [],
    });
  });

  it('rejects restaurant ids in all-store scope', async () => {
    prismaService.supplier.findUnique.mockResolvedValue(SUPPLIER);

    await expect(
      suppliersService.updateSupplierAvailability(3, {
        scope: 'all',
        restaurantIds: [2],
      }),
    ).rejects.toEqual(
      new BadRequestException('ALL_SCOPE_RESTAURANT_IDS_MUST_BE_EMPTY'),
    );

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects unavailable restaurant ids without changing availability', async () => {
    prismaService.supplier.findUnique.mockResolvedValue(SUPPLIER);
    prismaService.restaurant.count.mockResolvedValue(1);

    await expect(
      suppliersService.updateSupplierAvailability(3, {
        scope: 'selected',
        restaurantIds: [2, 999],
      }),
    ).rejects.toEqual(new BadRequestException('SOME_RESTAURANTS_NOT_FOUND'));

    expect(prismaService.$transaction).not.toHaveBeenCalled();
  });

  it('rejects orders when a supplier is not available to the restaurant', async () => {
    prismaService.supplier.count.mockResolvedValue(0);

    await expect(
      suppliersService.assertSupplierOrderable(3, 12),
    ).rejects.toEqual(
      new ForbiddenException('SUPPLIER_NOT_AVAILABLE_FOR_RESTAURANT'),
    );
  });
});

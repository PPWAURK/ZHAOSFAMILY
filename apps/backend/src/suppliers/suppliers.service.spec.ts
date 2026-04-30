import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
  it('returns the suppliers ordered by sort order then id', async () => {
    const prismaService = {
      supplier: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            name: 'JFC',
            sortOrder: 2,
            includeAllProductsInOrder: false,
          },
        ]),
      },
    };
    const suppliersService = new SuppliersService(prismaService as never);

    const result = await suppliersService.listSuppliers();

    expect(prismaService.supplier.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    expect(result).toEqual([
      {
        id: 3,
        name: 'JFC',
        sortOrder: 2,
        includeAllProductsInOrder: false,
      },
    ]);
  });
});

import { BadRequestException } from '@nestjs/common';
import { OrdersDocumentService } from './orders-document.service';
import { OrdersService } from './orders.service';

type ProductFixture = {
  id: bigint;
  supplierId: number;
  category: string;
  nameCn: string;
  designationFr: string;
  specification: string;
  specification2: null;
  specification3: null;
  unit: string;
  unit2: null;
  unit3: null;
  unitPriceHt: number;
  unitPriceHt2: null;
  unitPriceHt3: null;
};

type AsyncMock = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;

type TransactionClientMock = {
  purchaseOrder: {
    create: AsyncMock;
    delete: AsyncMock;
    update: AsyncMock;
  };
  purchaseOrderItem: {
    createMany: AsyncMock;
    deleteMany: AsyncMock;
  };
  inventoryMovement: {
    createMany: AsyncMock;
  };
};

type OrdersPrismaServiceMock = {
  product: {
    findMany: AsyncMock;
  };
  supplier: {
    findUnique: AsyncMock;
    findMany: AsyncMock;
  };
  restaurant: {
    findUnique: AsyncMock;
    findMany: AsyncMock;
  };
  inventoryMovement: {
    groupBy: AsyncMock;
  };
  purchaseOrder: {
    count: AsyncMock;
    findMany: AsyncMock;
    findUnique: AsyncMock;
    update: AsyncMock;
  };
  purchaseOrderItem: {
    groupBy: AsyncMock;
    findMany: AsyncMock;
  };
  purchaseReturn: {
    create: AsyncMock;
    delete: AsyncMock;
    findMany: AsyncMock;
    findUnique: AsyncMock;
  };
  purchaseReturnItem: {
    findMany: AsyncMock;
  };
  $transaction: jest.MockedFunction<
    (
      callback: (tx: TransactionClientMock) => Promise<unknown>,
    ) => Promise<unknown>
  >;
};

function createAsyncMock(): AsyncMock {
  return jest.fn<Promise<unknown>, unknown[]>();
}

function createProduct(
  overrides: Partial<ProductFixture> = {},
): ProductFixture {
  return {
    id: BigInt(11),
    supplierId: 1,
    category: 'dry',
    nameCn: '面条',
    designationFr: 'Nouilles',
    specification: '1kg',
    specification2: null,
    specification3: null,
    unit: 'sac',
    unit2: null,
    unit3: null,
    unitPriceHt: 2.5,
    unitPriceHt2: null,
    unitPriceHt3: null,
    ...overrides,
  };
}

describe('OrdersService', () => {
  let prismaService: OrdersPrismaServiceMock;
  let ordersDocumentService: jest.Mocked<
    Pick<
      OrdersDocumentService,
      | 'buildOrderFilePath'
      | 'buildOrderUrl'
      | 'deleteFileIfExists'
      | 'generateCommandePdf'
      | 'makeFrLabel'
      | 'resolveExistingOrderFile'
      | 'sanitizeLabel'
    >
  >;
  let service: OrdersService;

  beforeEach(() => {
    prismaService = {
      product: {
        findMany: createAsyncMock(),
      },
      supplier: {
        findUnique: createAsyncMock(),
        findMany: createAsyncMock(),
      },
      restaurant: {
        findUnique: createAsyncMock(),
        findMany: createAsyncMock(),
      },
      inventoryMovement: {
        groupBy: createAsyncMock(),
      },
      purchaseOrder: {
        count: createAsyncMock(),
        findMany: createAsyncMock(),
        findUnique: createAsyncMock(),
        update: createAsyncMock(),
      },
      purchaseOrderItem: {
        groupBy: createAsyncMock(),
        findMany: createAsyncMock(),
      },
      purchaseReturn: {
        create: createAsyncMock(),
        delete: createAsyncMock(),
        findMany: createAsyncMock(),
        findUnique: createAsyncMock(),
      },
      purchaseReturnItem: {
        findMany: createAsyncMock(),
      },
      $transaction: jest.fn((callback) =>
        callback({
          purchaseOrder: {
            create: createAsyncMock().mockResolvedValue({
              id: 42,
              createdAt: new Date('2026-04-29T10:00:00.000Z'),
            }),
            delete: createAsyncMock(),
            update: createAsyncMock(),
          },
          purchaseOrderItem: {
            createMany: createAsyncMock(),
            deleteMany: createAsyncMock(),
          },
          inventoryMovement: {
            createMany: createAsyncMock(),
          },
        }),
      ),
    };
    ordersDocumentService = {
      buildOrderFilePath: jest.fn((fileName) => `/tmp/${fileName}`),
      buildOrderUrl: jest.fn(
        () => 'http://localhost:3002/api/orders/42/commande',
      ),
      deleteFileIfExists: jest.fn(),
      generateCommandePdf: jest.fn().mockResolvedValue(undefined),
      makeFrLabel: jest.fn((value) => value),
      resolveExistingOrderFile: jest.fn((fileName) => `/tmp/${fileName}`),
      sanitizeLabel: jest.fn((value) => value?.trim() || '-'),
    };
    service = new OrdersService(
      prismaService,
      ordersDocumentService as unknown as OrdersDocumentService,
    );
  });

  it('creates an order with item snapshots and a PDF', async () => {
    prismaService.product.findMany.mockResolvedValue([createProduct()]);
    prismaService.supplier.findUnique.mockResolvedValue({
      id: 1,
      name: 'Metro',
      includeAllProductsInOrder: false,
    });
    prismaService.restaurant.findUnique.mockResolvedValue({
      id: 3,
      name: 'ZHAO Opera',
      address: '1 rue test',
    });

    const result = await service.createOrder(
      { id: 7, restaurantId: 3 },
      {
        deliveryDate: '2026-04-30',
        items: [{ productId: 11, quantity: 2, specificationSlot: 1 }],
      },
      { protocol: 'http', get: () => 'localhost:3002' },
    );

    expect(result).toMatchObject({
      id: 42,
      number: 'PO-20260429-0042',
      supplierId: 1,
      restaurantId: 3,
      totalItems: 2,
      totalAmount: 5,
    });
    expect(ordersDocumentService.generateCommandePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        orderNumber: 'PO-20260429-0042',
        supplierName: 'Metro',
        totalItems: 2,
        totalAmount: 5,
      }),
    );
  });

  it('creates a unique PDF file name for each order', async () => {
    const products = [
      createProduct({ id: BigInt(11), supplierId: 1 }),
      createProduct({ id: BigInt(22), supplierId: 2 }),
    ];
    let nextOrderId = 42;

    prismaService.product.findMany.mockImplementation(({ where }) => {
      const ids = (where as { id: { in: bigint[] } }).id.in;

      return Promise.resolve(
        products.filter((product) => ids.includes(product.id)),
      );
    });
    prismaService.supplier.findUnique.mockImplementation(({ where }) =>
      Promise.resolve({
        id: (where as { id: number }).id,
        name: (where as { id: number }).id === 1 ? 'Metro' : 'Boucherie',
        includeAllProductsInOrder: false,
      }),
    );
    prismaService.restaurant.findUnique.mockResolvedValue({
      id: 3,
      name: 'ZHAO Opera',
      address: '1 rue test',
    });
    prismaService.$transaction.mockImplementation(async (callback) => {
      const draftId = nextOrderId++;

      return callback({
        purchaseOrder: {
          create: createAsyncMock().mockResolvedValue({
            id: draftId,
            createdAt: new Date('2026-04-29T10:00:00.000Z'),
          }),
          delete: createAsyncMock(),
          update: createAsyncMock(),
        },
        purchaseOrderItem: {
          createMany: createAsyncMock(),
          deleteMany: createAsyncMock(),
        },
        inventoryMovement: {
          createMany: createAsyncMock(),
        },
      });
    });

    await service.createOrder(
      { id: 7, restaurantId: 3 },
      {
        deliveryDate: '2026-04-30',
        items: [{ productId: 11, quantity: 2, specificationSlot: 1 }],
      },
      { protocol: 'http', get: () => 'localhost:3002' },
    );
    await service.createOrder(
      { id: 7, restaurantId: 3 },
      {
        deliveryDate: '2026-04-30',
        items: [{ productId: 22, quantity: 1, specificationSlot: 1 }],
      },
      { protocol: 'http', get: () => 'localhost:3002' },
    );

    const generatedFilePaths =
      ordersDocumentService.generateCommandePdf.mock.calls.map(
        ([input]) => (input as { filePath: string }).filePath,
      );

    expect(generatedFilePaths[0]).toContain('PO-20260429-0042');
    expect(generatedFilePaths[1]).toContain('PO-20260429-0043');
    expect(new Set(generatedFilePaths).size).toBe(2);
  });

  it('rejects stock-enforced orders when stock is insufficient', async () => {
    prismaService.product.findMany.mockResolvedValue([
      createProduct({ supplierId: 8 }),
    ]);
    prismaService.supplier.findUnique.mockResolvedValue({
      id: 8,
      name: 'Stock supplier',
      includeAllProductsInOrder: false,
    });
    prismaService.restaurant.findUnique.mockResolvedValue({
      id: 3,
      name: 'ZHAO Opera',
      address: '1 rue test',
    });
    prismaService.inventoryMovement.groupBy.mockResolvedValue([
      { productId: BigInt(11), _sum: { delta: 1 } },
    ]);

    await expect(
      service.createOrder(
        { id: 7, restaurantId: 3 },
        {
          deliveryDate: '2026-04-30',
          items: [{ productId: 11, quantity: 2, specificationSlot: 1 }],
        },
        { protocol: 'http', get: () => 'localhost:3002' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('lists only current restaurant orders for store users', async () => {
    prismaService.purchaseOrder.findMany.mockResolvedValue([]);

    await service.listOrders(
      { id: 7, restaurantId: 3, jobRole: 'store-manager', permissions: [] },
      { protocol: 'http', get: () => 'localhost:3002' },
    );

    expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: 3 },
      }),
    );
  });

  it('lists all restaurant orders for holding viewers', async () => {
    prismaService.purchaseOrder.findMany.mockResolvedValue([
      {
        id: 42,
        number: 'PO-20260601-0042',
        supplierId: 1,
        supplier: { id: 1, name: 'Metro' },
        restaurantId: 5,
        restaurant: { id: 5, name: 'ZHAO Bastille' },
        createdByUser: {
          id: 9,
          name: 'Store User',
          email: 'store@zhao.test',
        },
        deliveryDate: new Date('2026-06-02T00:00:00.000Z'),
        deliveryAddress: '2 rue test',
        totalItems: 3,
        totalAmount: 30,
        createdAt: new Date('2026-06-01T10:00:00.000Z'),
        returns: [],
      },
      {
        id: 41,
        number: 'PO-20260601-0041',
        supplierId: 2,
        supplier: { id: 2, name: 'Boucherie' },
        restaurantId: 3,
        restaurant: { id: 3, name: 'ZHAO Opera' },
        createdByUser: {
          id: 7,
          name: 'Manager',
          email: 'manager@zhao.test',
        },
        deliveryDate: new Date('2026-06-02T00:00:00.000Z'),
        deliveryAddress: '1 rue test',
        totalItems: 2,
        totalAmount: 20,
        createdAt: new Date('2026-06-01T09:00:00.000Z'),
        returns: [],
      },
    ]);

    const result = (await service.listOrders(
      { id: 1, restaurantId: 3, jobRole: 'holding', permissions: [] },
      { protocol: 'http', get: () => 'localhost:3002' },
    )) as Array<Record<string, unknown>>;

    expect(prismaService.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
    expect(result.map((order) => order.restaurantId)).toEqual([5, 3]);
    expect(result[0]).toMatchObject({
      canEdit: false,
      canReturn: false,
      canDelete: false,
    });
    expect(result[1]).toMatchObject({
      canEdit: true,
      canReturn: true,
      canDelete: true,
    });
  });

  it('lists all restaurant order returns for holding viewers', async () => {
    prismaService.purchaseReturn.findMany.mockResolvedValue([
      {
        id: 10,
        purchaseOrderId: 42,
        purchaseOrder: {
          id: 42,
          number: 'PO-20260601-0042',
          deliveryDate: new Date('2026-06-02T00:00:00.000Z'),
        },
        supplierId: 1,
        supplier: { id: 1, name: 'Metro' },
        restaurantId: 5,
        restaurant: { id: 5, name: 'ZHAO Bastille' },
        reason: 'Damaged',
        notes: null,
        totalItems: 1,
        createdAt: new Date('2026-06-03T10:00:00.000Z'),
        items: [],
      },
    ]);

    const result = (await service.listOrderReturns({
      id: 1,
      restaurantId: 3,
      jobRole: 'holding',
      permissions: [],
    })) as Array<Record<string, unknown>>;

    expect(prismaService.purchaseReturn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      restaurantId: 5,
      restaurantName: 'ZHAO Bastille',
    });
  });

  it('allows holding viewers to resolve cross-store order files', async () => {
    prismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: 42,
      number: 'PO-20260429-0042',
      restaurantId: 5,
      bonFileName: 'ZHAO Bastille 2026-04-30 PO-20260429-0042.pdf',
      deliveryDate: new Date('2026-04-30T00:00:00.000Z'),
      deliveryAddress: '2 rue test',
      totalItems: 1,
      totalAmount: 2.5,
      supplier: { name: 'Metro' },
      restaurant: { name: 'ZHAO Bastille' },
      items: [],
    });

    await expect(
      service.resolveOrderFilePath(42, {
        id: 1,
        restaurantId: 3,
        jobRole: 'holding',
        permissions: [],
      }),
    ).resolves.toBe('/tmp/ZHAO Bastille 2026-04-30 PO-20260429-0042.pdf');
  });

  it('regenerates legacy shared PDF files before resolving an order file', async () => {
    prismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: 42,
      number: 'PO-20260429-0042',
      supplierId: 1,
      restaurantId: 5,
      bonFileName: 'ZHAO Opera 2026-04-30.pdf',
      deliveryDate: new Date('2026-04-30T00:00:00.000Z'),
      deliveryAddress: '1 rue test',
      totalItems: 2,
      totalAmount: 5,
      supplier: { id: 1, name: 'Metro' },
      restaurant: { id: 5, name: 'ZHAO Opera' },
      items: [
        {
          nameZh: '面条',
          nameFr: 'Nouilles',
          specification: '1kg',
          unit: 'sac',
          quantity: 2,
          unitPriceHt: 2.5,
          lineTotal: 5,
        },
      ],
    });
    prismaService.purchaseOrder.update.mockResolvedValue({});
    prismaService.purchaseOrder.count.mockResolvedValue(1);

    await expect(
      service.resolveOrderFilePath(42, {
        id: 1,
        restaurantId: 3,
        jobRole: 'holding',
        permissions: [],
      }),
    ).resolves.toBe('/tmp/ZHAO Opera 2026-04-30 PO-20260429-0042.pdf');

    expect(ordersDocumentService.generateCommandePdf).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/tmp/ZHAO Opera 2026-04-30 PO-20260429-0042.pdf',
        orderNumber: 'PO-20260429-0042',
        supplierName: 'Metro',
      }),
    );
    expect(prismaService.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { bonFileName: 'ZHAO Opera 2026-04-30 PO-20260429-0042.pdf' },
    });
  });

  it('builds a return draft with remaining quantities', async () => {
    prismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: 42,
      number: 'PO-20260429-0042',
      supplierId: 1,
      restaurantId: 3,
      deliveryDate: new Date('2026-04-30T00:00:00.000Z'),
      supplier: { id: 1, name: 'Metro' },
      items: [
        {
          id: 5,
          productId: BigInt(11),
          specificationSlot: 1,
          category: 'dry',
          nameZh: '面条',
          nameFr: 'Nouilles',
          specification: '1kg',
          unit: 'sac',
          quantity: 4,
        },
      ],
    });
    prismaService.purchaseReturnItem.findMany.mockResolvedValue([
      { purchaseOrderItemId: 5, quantity: 1 },
    ]);

    await expect(
      service.getOrderReturnDraft(42, { id: 7, restaurantId: 3 }),
    ).resolves.toMatchObject({
      orderId: 42,
      items: [{ purchaseOrderItemId: 5, remainingQuantity: 3 }],
    });
  });

  it('rejects return quantities above the remaining quantity', async () => {
    prismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: 42,
      number: 'PO-20260429-0042',
      supplierId: 1,
      restaurantId: 3,
      supplier: { id: 1, name: 'Metro' },
      items: [
        {
          id: 5,
          productId: BigInt(11),
          specificationSlot: 1,
          category: 'dry',
          nameZh: '面条',
          nameFr: 'Nouilles',
          specification: '1kg',
          unit: 'sac',
          quantity: 4,
        },
      ],
    });
    prismaService.purchaseReturnItem.findMany.mockResolvedValue([
      { purchaseOrderItemId: 5, quantity: 3 },
    ]);

    await expect(
      service.createOrderReturn(
        { id: 7, restaurantId: 3 },
        {
          orderId: 42,
          reason: 'Damaged',
          items: [{ purchaseOrderItemId: 5, quantity: 2 }],
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects deleting orders that already have returns', async () => {
    prismaService.purchaseOrder.findUnique.mockResolvedValue({
      id: 42,
      supplierId: 1,
      restaurantId: 3,
      bonFileName: 'order.pdf',
      returns: [{ id: 9 }],
      items: [],
    });

    await expect(
      service.deleteOrder(42, { id: 7, restaurantId: 3 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('groups product stats by supplier, scoped to the store user own restaurant', async () => {
    prismaService.purchaseOrderItem.groupBy.mockResolvedValue([
      {
        supplierId: 1,
        productId: BigInt(10),
        _sum: { quantity: 5, lineTotal: 50 },
        _count: { _all: 2 },
      },
      {
        supplierId: 2,
        productId: BigInt(20),
        _sum: { quantity: 8, lineTotal: 120 },
        _count: { _all: 1 },
      },
    ]);
    prismaService.purchaseOrderItem.findMany.mockResolvedValue([
      {
        productId: BigInt(10),
        nameZh: '番茄',
        nameFr: 'Tomate',
        unit: 'kg',
        category: 'veg',
      },
      {
        productId: BigInt(20),
        nameZh: '牛肉',
        nameFr: 'Boeuf',
        unit: 'kg',
        category: 'meat',
      },
    ]);
    prismaService.supplier.findMany.mockResolvedValue([
      { id: 1, name: 'Metro' },
      { id: 2, name: 'Boucherie' },
    ]);

    const result = await service.getProductOrderStats(
      { id: 7, restaurantId: 3, jobRole: 'store-manager', permissions: [] },
      { from: '2026-06-01', to: '2026-06-30' },
    );

    // Suppliers sorted by spend desc.
    expect(result.suppliers.map((group) => group.supplierName)).toEqual([
      'Boucherie',
      'Metro',
    ]);
    expect(result.suppliers[0]).toMatchObject({
      supplierId: 2,
      totalAmount: 120,
      totalQuantity: 8,
    });
    expect(result.canViewAllStores).toBe(false);
    expect(result.stores).toEqual([]);
    expect(result.totalAmount).toBe(170);
    expect(result.totalQuantity).toBe(13);
    expect(result.totalProducts).toBe(2);

    // Store user is pinned to their own restaurant; whole day included for the
    // date-only upper bound.
    const where = prismaService.purchaseOrderItem.groupBy.mock.calls[0][0] as {
      where: {
        purchaseOrder: { restaurantId: number; createdAt: { lte: Date } };
      };
    };
    expect(where.where.purchaseOrder.restaurantId).toBe(3);
    expect(where.where.purchaseOrder.createdAt.lte.toISOString()).toContain(
      '2026-06-30T23:59:59',
    );
    // No store list query for a non-holding viewer.
    expect(prismaService.restaurant.findMany).not.toHaveBeenCalled();
  });

  it('lets holding target any store and lists stores', async () => {
    prismaService.purchaseOrderItem.groupBy.mockResolvedValue([]);
    prismaService.purchaseOrderItem.findMany.mockResolvedValue([]);
    prismaService.supplier.findMany.mockResolvedValue([]);
    prismaService.restaurant.findMany.mockResolvedValue([
      { id: 3, name: 'ZHAO Opera' },
      { id: 5, name: 'ZHAO Bastille' },
    ]);

    const result = await service.getProductOrderStats(
      { id: 1, restaurantId: 99, jobRole: 'holding', permissions: [] },
      { restaurantId: 5 },
    );

    expect(result.canViewAllStores).toBe(true);
    expect(result.restaurantId).toBe(5);
    expect(result.stores).toHaveLength(2);

    // Holding's own restaurantId (99) is ignored in favour of the requested store.
    const where = prismaService.purchaseOrderItem.groupBy.mock.calls[0][0] as {
      where: { purchaseOrder: { restaurantId?: number } };
    };
    expect(where.where.purchaseOrder.restaurantId).toBe(5);
  });

  it('aggregates all stores for holding when no store is specified', async () => {
    prismaService.purchaseOrderItem.groupBy.mockResolvedValue([]);
    prismaService.purchaseOrderItem.findMany.mockResolvedValue([]);
    prismaService.supplier.findMany.mockResolvedValue([]);
    prismaService.restaurant.findMany.mockResolvedValue([]);

    await service.getProductOrderStats(
      { id: 1, restaurantId: 99, jobRole: 'holding', permissions: [] },
      {},
    );

    const where = prismaService.purchaseOrderItem.groupBy.mock.calls[0][0] as {
      where: { purchaseOrder: Record<string, unknown> };
    };
    expect(where.where.purchaseOrder.restaurantId).toBeUndefined();
  });
});

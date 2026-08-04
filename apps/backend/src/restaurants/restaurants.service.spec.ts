import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  function createService() {
    const restaurant = {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const prismaService = {
      restaurant,
      $transaction: jest.fn(
        (
          callback: (transaction: { restaurant: typeof restaurant }) => unknown,
        ) => Promise.resolve(callback({ restaurant })),
      ),
    };

    return {
      prismaService,
      restaurantsService: new RestaurantsService(prismaService as never),
    };
  }

  it('returns the restaurant list ordered by store code', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.findMany.mockResolvedValue([
      {
        id: 2,
        storeCode: 4,
        name: 'Paris Opera',
        address: '10 Rue Example',
        photoObjectKey: 'stores/photos/2026/07/paris.jpg',
      },
    ]);

    const result = await restaurantsService.listRestaurants();

    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        storeCode: true,
        name: true,
        address: true,
        photoObjectKey: true,
      },
      orderBy: {
        storeCode: 'asc',
      },
    });
    expect(result).toEqual([
      {
        id: 2,
        storeCode: 4,
        name: 'Paris Opera',
        address: '10 Rue Example',
        photoObjectKey: 'stores/photos/2026/07/paris.jpg',
      },
    ]);
  });

  it('creates a restaurant with a normalized optional photo object key', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.create.mockResolvedValue({
      id: 3,
      storeCode: 13,
      name: 'ZHAO Lyon',
      address: '2 Rue Lyon',
      photoObjectKey: null,
    });
    prismaService.restaurant.findFirst.mockResolvedValue({ storeCode: 12 });

    const result = await restaurantsService.createRestaurant({
      name: ' ZHAO Lyon ',
      address: ' 2 Rue Lyon ',
      photoObjectKey: ' ',
    });

    expect(prismaService.restaurant.create).toHaveBeenCalledWith({
      data: {
        storeCode: 13,
        name: 'ZHAO Lyon',
        address: '2 Rue Lyon',
        photoObjectKey: null,
        updatedAt: expect.any(Date) as Date,
      },
      select: {
        id: true,
        storeCode: true,
        name: true,
        address: true,
        photoObjectKey: true,
      },
    });
    expect(result).toEqual({
      id: 3,
      storeCode: 13,
      name: 'ZHAO Lyon',
      address: '2 Rue Lyon',
      photoObjectKey: null,
    });
  });

  it('updates a restaurant with only provided fields', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.update.mockResolvedValue({
      id: 4,
      storeCode: 14,
      name: 'ZHAO Nice',
      address: '4 Rue Nice',
      photoObjectKey: 'stores/photos/2026/07/nice.jpg',
    });

    await restaurantsService.updateRestaurant(4, {
      address: ' 4 Rue Nice ',
    });

    expect(prismaService.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: 4,
      },
      data: {
        address: '4 Rue Nice',
        updatedAt: expect.any(Date) as Date,
      },
      select: {
        id: true,
        storeCode: true,
        name: true,
        address: true,
        photoObjectKey: true,
      },
    });
  });

  it('clears the photo when the update explicitly sends null', async () => {
    const { prismaService, restaurantsService } = createService();
    prismaService.restaurant.update.mockResolvedValue({
      id: 4,
      storeCode: 14,
      name: 'ZHAO Nice',
      address: '4 Rue Nice',
      photoObjectKey: null,
    });

    await restaurantsService.updateRestaurant(4, { photoObjectKey: null });

    expect(prismaService.restaurant.update).toHaveBeenCalledWith({
      where: {
        id: 4,
      },
      data: {
        photoObjectKey: null,
        updatedAt: expect.any(Date) as Date,
      },
      select: {
        id: true,
        storeCode: true,
        name: true,
        address: true,
        photoObjectKey: true,
      },
    });
  });

  it('deletes a restaurant by id', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.delete.mockResolvedValue({
      id: 5,
    });

    await restaurantsService.deleteRestaurant(5);

    expect(prismaService.restaurant.delete).toHaveBeenCalledWith({
      where: {
        id: 5,
      },
    });
  });
});

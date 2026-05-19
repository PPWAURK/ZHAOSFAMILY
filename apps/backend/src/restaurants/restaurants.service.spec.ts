import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  function createService() {
    const prismaService = {
      restaurant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    return {
      prismaService,
      restaurantsService: new RestaurantsService(prismaService as never),
    };
  }

  it('returns the restaurant list ordered by id', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.findMany.mockResolvedValue([
      {
        id: 2,
        name: 'Paris Opera',
        address: '10 Rue Example',
        photoUrl: '/uploads/paris.jpg',
      },
    ]);

    const result = await restaurantsService.listRestaurants();

    expect(prismaService.restaurant.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        address: true,
        photoUrl: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
    expect(result).toEqual([
      {
        id: 2,
        name: 'Paris Opera',
        address: '10 Rue Example',
        photoUrl: '/uploads/paris.jpg',
      },
    ]);
  });

  it('creates a restaurant with normalized optional photo url', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.create.mockResolvedValue({
      id: 3,
      name: 'ZHAO Lyon',
      address: '2 Rue Lyon',
      photoUrl: null,
    });

    const result = await restaurantsService.createRestaurant({
      name: ' ZHAO Lyon ',
      address: ' 2 Rue Lyon ',
      photoUrl: ' ',
    });

    expect(prismaService.restaurant.create).toHaveBeenCalledWith({
      data: {
        name: 'ZHAO Lyon',
        address: '2 Rue Lyon',
        photoUrl: null,
        updatedAt: expect.any(Date) as Date,
      },
      select: {
        id: true,
        name: true,
        address: true,
        photoUrl: true,
      },
    });
    expect(result).toEqual({
      id: 3,
      name: 'ZHAO Lyon',
      address: '2 Rue Lyon',
      photoUrl: null,
    });
  });

  it('updates a restaurant with only provided fields', async () => {
    const { prismaService, restaurantsService } = createService();

    prismaService.restaurant.update.mockResolvedValue({
      id: 4,
      name: 'ZHAO Nice',
      address: '4 Rue Nice',
      photoUrl: '/nice.jpg',
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
        name: true,
        address: true,
        photoUrl: true,
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

import { RestaurantsService } from './restaurants.service';

describe('RestaurantsService', () => {
  it('returns the restaurant list ordered by id', async () => {
    const prismaService = {
      restaurant: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 2,
            name: 'Paris Opera',
            address: '10 Rue Example',
            photoUrl: '/uploads/paris.jpg',
          },
        ]),
      },
    };
    const restaurantsService = new RestaurantsService(prismaService as never);

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
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type RestaurantListItem = {
  id: number;
  name: string;
  address: string;
  photoUrl: string | null;
};

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  async ensureRestaurantExists(restaurantId: number): Promise<void> {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      select: {
        id: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }
  }

  async listRestaurants(): Promise<RestaurantListItem[]> {
    const restaurants = await this.prismaService.restaurant.findMany({
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

    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      photoUrl: restaurant.photoUrl,
    }));
  }
}

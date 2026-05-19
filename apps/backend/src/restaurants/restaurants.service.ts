import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

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

  async getRestaurant(restaurantId: number): Promise<RestaurantListItem> {
    const restaurant = await this.prismaService.restaurant.findUnique({
      where: {
        id: restaurantId,
      },
      select: {
        id: true,
        name: true,
        address: true,
        photoUrl: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }

    return restaurant;
  }

  async createRestaurant(
    dto: CreateRestaurantDto,
  ): Promise<RestaurantListItem> {
    try {
      return await this.prismaService.restaurant.create({
        data: {
          name: dto.name.trim(),
          address: dto.address.trim(),
          photoUrl: this.normalizePhotoUrl(dto.photoUrl),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          address: true,
          photoUrl: true,
        },
      });
    } catch (error) {
      this.handleRestaurantWriteError(error);
    }
  }

  async updateRestaurant(
    restaurantId: number,
    dto: UpdateRestaurantDto,
  ): Promise<RestaurantListItem> {
    try {
      return await this.prismaService.restaurant.update({
        where: {
          id: restaurantId,
        },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
          ...(dto.photoUrl !== undefined
            ? { photoUrl: this.normalizePhotoUrl(dto.photoUrl) }
            : {}),
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          address: true,
          photoUrl: true,
        },
      });
    } catch (error) {
      this.handleRestaurantWriteError(error);
    }
  }

  async deleteRestaurant(restaurantId: number): Promise<void> {
    try {
      await this.prismaService.restaurant.delete({
        where: {
          id: restaurantId,
        },
      });
    } catch (error) {
      this.handleRestaurantWriteError(error);
    }
  }

  private normalizePhotoUrl(photoUrl: string | undefined): string | null {
    if (photoUrl === undefined) {
      return null;
    }

    return photoUrl.trim() || null;
  }

  private handleRestaurantWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('RESTAURANT_NAME_ALREADY_EXISTS');
      }

      if (error.code === 'P2003') {
        throw new ConflictException('RESTAURANT_IN_USE');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('RESTAURANT_NOT_FOUND');
      }
    }

    throw error;
  }
}

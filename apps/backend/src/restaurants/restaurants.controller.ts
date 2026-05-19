import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  RestaurantsService,
  type RestaurantListItem,
} from './restaurants.service';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  listRestaurants(): Promise<RestaurantListItem[]> {
    return this.restaurantsService.listRestaurants();
  }

  @Get(':id')
  getRestaurant(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RestaurantListItem> {
    return this.restaurantsService.getRestaurant(id);
  }

  @Post()
  createRestaurant(
    @Body() dto: CreateRestaurantDto,
  ): Promise<RestaurantListItem> {
    return this.restaurantsService.createRestaurant(dto);
  }

  @Patch(':id')
  updateRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<RestaurantListItem> {
    return this.restaurantsService.updateRestaurant(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRestaurant(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.restaurantsService.deleteRestaurant(id);
  }
}

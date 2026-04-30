import { Controller, Get } from '@nestjs/common';
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
}

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
  UseGuards,
} from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  RestaurantsService,
  type RestaurantListItem,
} from './restaurants.service';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CATALOG_PERMISSIONS, RequirePermissions } from '../auth/permissions';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  // Public: web/mobile registration flows populate the store picker before
  // login. RestaurantListItem only exposes id/name/address/photoUrl — no
  // sensitive data.
  @Public()
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
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageRestaurants)
  createRestaurant(
    @Body() dto: CreateRestaurantDto,
  ): Promise<RestaurantListItem> {
    return this.restaurantsService.createRestaurant(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageRestaurants)
  updateRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestaurantDto,
  ): Promise<RestaurantListItem> {
    return this.restaurantsService.updateRestaurant(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageRestaurants)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRestaurant(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.restaurantsService.deleteRestaurant(id);
  }
}

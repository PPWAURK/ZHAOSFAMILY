import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService, type ProductListItem } from './products.service';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CATALOG_PERMISSIONS, RequirePermissions } from '../auth/permissions';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  listProducts(
    @Query() query: ListProductsQueryDto,
  ): Promise<ProductListItem[]> {
    return this.productsService.listProductsBySupplier(query.supplierId);
  }

  @Get(':id')
  getProduct(@Param('id') id: string): Promise<ProductListItem> {
    return this.productsService.getProduct(id);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageProducts)
  createProduct(@Body() dto: CreateProductDto): Promise<ProductListItem> {
    return this.productsService.createProduct(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageProducts)
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductListItem> {
    return this.productsService.updateProduct(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageProducts)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string): Promise<void> {
    await this.productsService.deleteProduct(id);
  }
}

import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import multer from 'multer';
import type { Response } from 'express';

import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService, type ProductListItem } from './products.service';
import {
  ProductImagesService,
  type UploadedProductImage,
} from './product-images.service';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CATALOG_PERMISSIONS, RequirePermissions } from '../auth/permissions';
import { Public } from '../auth/decorators/public.decorator';

const PRODUCT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const PRODUCT_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Post('images')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageProducts)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: PRODUCT_IMAGE_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        if (!PRODUCT_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException('PRODUCT_IMAGE_TYPE_NOT_ALLOWED'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadedProductImage> {
    if (!file) {
      throw new BadRequestException('PRODUCT_IMAGE_FILE_REQUIRED');
    }

    return this.productImagesService.saveImage(file);
  }

  @Public()
  @Get('images/:fileName')
  getImage(
    @Param('fileName') fileName: string,
    @Res() response: Response,
  ): void {
    const filePath = this.productImagesService.getImagePath(fileName);

    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.sendFile(filePath);
  }

  @Get()
  listProducts(
    @Query() query: ListProductsQueryDto,
  ): Promise<ProductListItem[]> {
    return this.productsService.listProductsBySupplier(
      query.supplierId,
      query.includeInactive,
    );
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

import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductImagesService } from './product-images.service';
import { ProductsService } from './products.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ProductsController],
  providers: [ProductsService, ProductImagesService],
  exports: [ProductsService],
})
export class ProductsModule {}

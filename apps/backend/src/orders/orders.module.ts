import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { OrdersController } from './orders.controller';
import { OrdersDocumentService } from './orders-document.service';
import { OrderQuantityConversionService } from './order-quantity-conversion.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, SuppliersModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersDocumentService,
    OrderQuantityConversionService,
  ],
})
export class OrdersModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersDocumentService } from './orders-document.service';
import { OrderQuantityConversionService } from './order-quantity-conversion.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersDocumentService,
    OrderQuantityConversionService,
  ],
})
export class OrdersModule {}

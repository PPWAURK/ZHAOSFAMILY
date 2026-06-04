import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DashboardNewsModule } from './dashboard-news/dashboard-news.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { OrdersModule } from './orders/orders.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    DashboardNewsModule,
    HealthModule,
    ProductsModule,
    RestaurantsModule,
    SuppliersModule,
    OrdersModule,
    InventoryModule,
    PermissionsModule,
    TrainingModule,
    MediaModule,
    MailModule,
  ],
})
export class AppModule {}

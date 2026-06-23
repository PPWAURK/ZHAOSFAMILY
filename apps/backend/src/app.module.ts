import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AbcScoresModule } from './abc-scores/abc-scores.module';
import { AuthModule } from './auth/auth.module';
import { CaseSharesModule } from './case-shares/case-shares.module';
import { DashboardNewsModule } from './dashboard-news/dashboard-news.module';
import { HealthModule } from './health/health.module';
import { InventoryModule } from './inventory/inventory.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { RecruitmentRequestsModule } from './recruitment-requests/recruitment-requests.module';
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
    AbcScoresModule,
    CaseSharesModule,
    DashboardNewsModule,
    HealthModule,
    ProductsModule,
    RecruitmentRequestsModule,
    RestaurantsModule,
    SuppliersModule,
    OrdersModule,
    InventoryModule,
    PermissionsModule,
    TrainingModule,
    MediaModule,
    MailModule,
    NotificationsModule,
  ],
})
export class AppModule {}

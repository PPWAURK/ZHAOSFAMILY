import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { ConfigModule } from '@nestjs/config';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [ConfigModule, RestaurantsModule],
  controllers: [AuthController],
  providers: [AuthService, PermissionGuard],
  exports: [AuthService, PermissionGuard],
})
export class AuthModule {}

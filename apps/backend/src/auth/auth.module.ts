import { forwardRef, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { ConfigModule } from '@nestjs/config';
import { PermissionGuard } from './guards/permission.guard';
import { AuthGuard } from './guards/auth.guard';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => RestaurantsModule),
    forwardRef(() => MailModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PermissionGuard,
    AuthGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, PermissionGuard, AuthGuard],
})
export class AuthModule {}

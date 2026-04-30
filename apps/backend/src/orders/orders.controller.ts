import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthUser } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { CreateOrderReturnDto } from './dto/create-order-return.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

type OrderActor = {
  id: number;
  restaurantId: number;
};

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly authService: AuthService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  async createOrder(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: Request,
    @Body() dto: CreateOrderDto,
  ): Promise<unknown> {
    return this.ordersService.createOrder(
      await this.getActor(authorization),
      dto,
      request,
    );
  }

  @Get()
  async listOrders(
    @Headers('authorization') authorization: string | undefined,
    @Req() request: Request,
  ): Promise<unknown> {
    return this.ordersService.listOrders(
      await this.getActor(authorization),
      request,
    );
  }

  @Get('returns')
  async listOrderReturns(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<unknown> {
    return this.ordersService.listOrderReturns(await this.getActor(authorization));
  }

  @Get(':id/return-draft')
  async getOrderReturnDraft(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) orderId: number,
  ): Promise<unknown> {
    return this.ordersService.getOrderReturnDraft(
      orderId,
      await this.getActor(authorization),
    );
  }

  @Post('returns')
  async createOrderReturn(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateOrderReturnDto,
  ): Promise<unknown> {
    return this.ordersService.createOrderReturn(
      await this.getActor(authorization),
      dto,
    );
  }

  @Delete('returns/:id')
  async deleteOrderReturn(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) returnId: number,
  ): Promise<unknown> {
    return this.ordersService.deleteOrderReturn(
      returnId,
      await this.getActor(authorization),
    );
  }

  @Get(':id/commande')
  async downloadCommande(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) orderId: number,
    @Res() response: Response,
  ): Promise<void> {
    const filePath = await this.ordersService.resolveOrderFilePath(
      orderId,
      await this.getActor(authorization),
    );

    response.download(filePath);
  }

  @Delete(':id')
  async deleteOrder(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseIntPipe) orderId: number,
  ): Promise<unknown> {
    return this.ordersService.deleteOrder(
      orderId,
      await this.getActor(authorization),
    );
  }

  private async getActor(
    authorization: string | undefined,
  ): Promise<OrderActor> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );

    return {
      id: user.id,
      restaurantId: this.getRestaurantId(user),
    };
  }

  private getRestaurantId(user: AuthUser): number {
    return user.restaurantId;
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CreateMovementDto } from './dto/create-movement.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import {
  InventoryService,
  type InventoryLineItem,
  type InventoryMovementItem,
} from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  listInventory(
    @Query() query: ListInventoryQueryDto,
  ): Promise<InventoryLineItem[]> {
    return this.inventoryService.listInventoryForSupplier(query.supplierId);
  }

  @Get('movements')
  listMovements(
    @Query() query: ListMovementsQueryDto,
  ): Promise<InventoryMovementItem[]> {
    return this.inventoryService.listMovements({
      productId: query.productId,
      supplierId: query.supplierId,
      limit: query.limit,
    });
  }

  @Post('movements')
  createMovement(
    @Body() dto: CreateMovementDto,
  ): Promise<InventoryMovementItem> {
    return this.inventoryService.createMovement(dto);
  }
}

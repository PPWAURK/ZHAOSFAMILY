import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CreateMovementDto } from './dto/create-movement.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import {
  InventoryService,
  type InventoryLineItem,
  type InventoryMovementItem,
} from './inventory.service';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { INVENTORY_PERMISSIONS, RequirePermissions } from '../auth/permissions';

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
  @UseGuards(PermissionGuard)
  @RequirePermissions(INVENTORY_PERMISSIONS.createMovement)
  createMovement(
    @Body() dto: CreateMovementDto,
  ): Promise<InventoryMovementItem> {
    return this.inventoryService.createMovement(dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { parseBearerToken } from '../auth/auth-token.utils';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { INVENTORY_PERMISSIONS, RequirePermissions } from '../auth/permissions';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListInventoryQueryDto } from './dto/list-inventory-query.dto';
import { ListMovementsQueryDto } from './dto/list-movements-query.dto';
import { ListRecordsQueryDto } from './dto/list-records-query.dto';
import { InventoryRecordsService } from './inventory-records.service';
import { InventoryService } from './inventory.service';
import type {
  InventoryLineItem,
  InventoryMovementItem,
  InventoryRecordsResult,
} from './inventory.types';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly authService: AuthService,
    private readonly inventoryService: InventoryService,
    private readonly inventoryRecordsService: InventoryRecordsService,
  ) {}

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

  /** Monthly inbound / outbound / store-order records (CSV export source). */
  @Get('records')
  @UseGuards(PermissionGuard)
  @RequirePermissions(INVENTORY_PERMISSIONS.createMovement)
  listRecords(
    @Query() query: ListRecordsQueryDto,
  ): Promise<InventoryRecordsResult> {
    return this.inventoryRecordsService.listMonthlyRecords({
      month: query.month,
      supplierIds: query.supplierIds,
      restaurantId: query.restaurantId,
    });
  }

  @Post('movements')
  @UseGuards(PermissionGuard)
  @RequirePermissions(INVENTORY_PERMISSIONS.createMovement)
  async createMovement(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateMovementDto,
  ): Promise<InventoryMovementItem> {
    const user = await this.authService.getCurrentUser(
      parseBearerToken(authorization),
    );
    return this.inventoryService.createMovement(dto, user.id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierAvailabilityDto } from './dto/update-supplier-availability.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  SuppliersService,
  type SupplierAvailability,
  type SupplierListItem,
} from './suppliers.service';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CATALOG_PERMISSIONS, RequirePermissions } from '../auth/permissions';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  listSuppliers(): Promise<SupplierListItem[]> {
    return this.suppliersService.listSuppliers();
  }

  @Get('orderable')
  listOrderableSuppliers(
    @Req() request: AuthenticatedRequest,
  ): Promise<SupplierListItem[]> {
    return this.suppliersService.listOrderableSuppliers(
      request.user!.restaurantId,
    );
  }

  @Get(':id/availability')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageSuppliers)
  getSupplierAvailability(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierAvailability> {
    return this.suppliersService.getSupplierAvailability(id);
  }

  @Put(':id/availability')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageSuppliers)
  updateSupplierAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierAvailabilityDto,
  ): Promise<SupplierAvailability> {
    return this.suppliersService.updateSupplierAvailability(id, dto);
  }

  @Get(':id')
  getSupplier(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierListItem> {
    return this.suppliersService.getSupplier(id);
  }

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageSuppliers)
  createSupplier(@Body() dto: CreateSupplierDto): Promise<SupplierListItem> {
    return this.suppliersService.createSupplier(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageSuppliers)
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierListItem> {
    return this.suppliersService.updateSupplier(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions(CATALOG_PERMISSIONS.manageSuppliers)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSupplier(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.suppliersService.deleteSupplier(id);
  }
}

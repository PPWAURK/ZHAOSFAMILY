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
} from '@nestjs/common';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService, type SupplierListItem } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  listSuppliers(): Promise<SupplierListItem[]> {
    return this.suppliersService.listSuppliers();
  }

  @Get(':id')
  getSupplier(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SupplierListItem> {
    return this.suppliersService.getSupplier(id);
  }

  @Post()
  createSupplier(@Body() dto: CreateSupplierDto): Promise<SupplierListItem> {
    return this.suppliersService.createSupplier(dto);
  }

  @Patch(':id')
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierListItem> {
    return this.suppliersService.updateSupplier(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSupplier(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.suppliersService.deleteSupplier(id);
  }
}

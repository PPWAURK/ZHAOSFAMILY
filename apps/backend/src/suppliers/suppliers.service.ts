import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';

export type SupplierListItem = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
};

@Injectable()
export class SuppliersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listSuppliers(): Promise<SupplierListItem[]> {
    const suppliers = await this.prismaService.supplier.findMany({
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return suppliers;
  }

  async getSupplier(id: number): Promise<SupplierListItem> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('SUPPLIER_NOT_FOUND');
    }

    return supplier;
  }

  async createSupplier(dto: CreateSupplierDto): Promise<SupplierListItem> {
    const nextSortOrder = await this.resolveNextSortOrder(dto.sortOrder);

    return this.prismaService.supplier.create({
      data: {
        name: dto.name.trim(),
        sortOrder: nextSortOrder,
        includeAllProductsInOrder: dto.includeAllProductsInOrder ?? false,
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
    });
  }

  async updateSupplier(
    id: number,
    dto: UpdateSupplierDto,
  ): Promise<SupplierListItem> {
    await this.getSupplier(id);

    return this.prismaService.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.includeAllProductsInOrder !== undefined
          ? { includeAllProductsInOrder: dto.includeAllProductsInOrder }
          : {}),
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        includeAllProductsInOrder: true,
      },
    });
  }

  async deleteSupplier(id: number): Promise<void> {
    await this.getSupplier(id);

    await this.prismaService.$transaction([
      this.prismaService.product.deleteMany({ where: { supplierId: id } }),
      this.prismaService.supplier.delete({ where: { id } }),
    ]);
  }

  private async resolveNextSortOrder(requested?: number): Promise<number> {
    if (requested !== undefined) {
      return requested;
    }

    const last = await this.prismaService.supplier.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return (last?.sortOrder ?? 0) + 1;
  }
}

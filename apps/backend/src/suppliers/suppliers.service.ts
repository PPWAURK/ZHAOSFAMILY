import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';

export type SupplierListItem = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
  orderNotice: string | null;
};

const SUPPLIER_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  includeAllProductsInOrder: true,
  orderNotice: true,
} as const;

type SupplierRow = SupplierListItem;

function toSupplierListItem(supplier: SupplierRow): SupplierListItem {
  return {
    id: supplier.id,
    name: supplier.name,
    sortOrder: supplier.sortOrder,
    includeAllProductsInOrder: supplier.includeAllProductsInOrder,
    orderNotice: supplier.orderNotice ?? null,
  };
}

function normalizeOrderNotice(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prismaService: PrismaService) {}

  async listSuppliers(): Promise<SupplierListItem[]> {
    const suppliers = await this.prismaService.supplier.findMany({
      select: SUPPLIER_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return suppliers.map(toSupplierListItem);
  }

  async getSupplier(id: number): Promise<SupplierListItem> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id },
      select: SUPPLIER_SELECT,
    });

    if (!supplier) {
      throw new NotFoundException('SUPPLIER_NOT_FOUND');
    }

    return toSupplierListItem(supplier);
  }

  async createSupplier(dto: CreateSupplierDto): Promise<SupplierListItem> {
    const nextSortOrder = await this.resolveNextSortOrder(dto.sortOrder);

    const supplier = await this.prismaService.supplier.create({
      data: {
        name: dto.name.trim(),
        sortOrder: nextSortOrder,
        includeAllProductsInOrder: dto.includeAllProductsInOrder ?? false,
        orderNotice: normalizeOrderNotice(dto.orderNotice),
      },
      select: SUPPLIER_SELECT,
    });

    return toSupplierListItem(supplier);
  }

  async updateSupplier(
    id: number,
    dto: UpdateSupplierDto,
  ): Promise<SupplierListItem> {
    await this.getSupplier(id);

    const supplier = await this.prismaService.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.includeAllProductsInOrder !== undefined
          ? { includeAllProductsInOrder: dto.includeAllProductsInOrder }
          : {}),
        ...(dto.orderNotice !== undefined
          ? { orderNotice: normalizeOrderNotice(dto.orderNotice) }
          : {}),
      },
      select: SUPPLIER_SELECT,
    });

    return toSupplierListItem(supplier);
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

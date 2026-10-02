import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateSupplierDto } from './dto/create-supplier.dto';
import type {
  SupplierAvailabilityScope,
  UpdateSupplierAvailabilityDto,
} from './dto/update-supplier-availability.dto';
import type { UpdateSupplierDto } from './dto/update-supplier.dto';

export type SupplierListItem = {
  id: number;
  name: string;
  sortOrder: number;
  includeAllProductsInOrder: boolean;
  orderNotice: string | null;
  orderNoticeFr: string | null;
};

export type SupplierAvailability = {
  supplierId: number;
  scope: SupplierAvailabilityScope;
  restaurantIds: number[];
};

const SUPPLIER_SELECT = {
  id: true,
  name: true,
  sortOrder: true,
  includeAllProductsInOrder: true,
  orderNotice: true,
  orderNoticeFr: true,
} as const;

type SupplierRow = SupplierListItem;

function toSupplierListItem(supplier: SupplierRow): SupplierListItem {
  return {
    id: supplier.id,
    name: supplier.name,
    sortOrder: supplier.sortOrder,
    includeAllProductsInOrder: supplier.includeAllProductsInOrder,
    orderNotice: supplier.orderNotice ?? null,
    orderNoticeFr: supplier.orderNoticeFr ?? null,
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

  async listOrderableSuppliers(
    restaurantId: number,
  ): Promise<SupplierListItem[]> {
    const suppliers = await this.prismaService.supplier.findMany({
      where: this.buildOrderableSupplierWhere(restaurantId),
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

  async getSupplierAvailability(id: number): Promise<SupplierAvailability> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        availableToAllRestaurants: true,
        restaurantAvailabilities: {
          select: { restaurantId: true },
          orderBy: { restaurantId: 'asc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('SUPPLIER_NOT_FOUND');
    }

    return {
      supplierId: supplier.id,
      scope: supplier.availableToAllRestaurants ? 'all' : 'selected',
      restaurantIds: supplier.availableToAllRestaurants
        ? []
        : supplier.restaurantAvailabilities.map(
            (availability) => availability.restaurantId,
          ),
    };
  }

  async updateSupplierAvailability(
    id: number,
    dto: UpdateSupplierAvailabilityDto,
  ): Promise<SupplierAvailability> {
    await this.getSupplier(id);
    const selectedRestaurantIds = [...dto.restaurantIds].sort(
      (left, right) => left - right,
    );

    if (dto.scope === 'all' && dto.restaurantIds.length > 0) {
      throw new BadRequestException('ALL_SCOPE_RESTAURANT_IDS_MUST_BE_EMPTY');
    }

    if (dto.scope === 'selected' && selectedRestaurantIds.length > 0) {
      const restaurantCount = await this.prismaService.restaurant.count({
        where: { id: { in: selectedRestaurantIds } },
      });

      if (restaurantCount !== selectedRestaurantIds.length) {
        throw new BadRequestException('SOME_RESTAURANTS_NOT_FOUND');
      }
    }

    await this.prismaService.$transaction(async (transaction) => {
      await transaction.supplier.update({
        where: { id },
        data: { availableToAllRestaurants: dto.scope === 'all' },
      });
      await transaction.supplierRestaurantAvailability.deleteMany({
        where: { supplierId: id },
      });

      if (dto.scope === 'selected' && selectedRestaurantIds.length > 0) {
        await transaction.supplierRestaurantAvailability.createMany({
          data: selectedRestaurantIds.map((restaurantId) => ({
            supplierId: id,
            restaurantId,
          })),
        });
      }
    });

    return {
      supplierId: id,
      scope: dto.scope,
      restaurantIds: dto.scope === 'selected' ? selectedRestaurantIds : [],
    };
  }

  async listOrderableSupplierIds(restaurantId: number): Promise<Set<number>> {
    const suppliers = await this.prismaService.supplier.findMany({
      where: this.buildOrderableSupplierWhere(restaurantId),
      select: { id: true },
    });

    return new Set(suppliers.map((supplier) => supplier.id));
  }

  async assertSupplierOrderable(
    supplierId: number,
    restaurantId: number,
  ): Promise<void> {
    const isOrderable = await this.isSupplierOrderable(
      supplierId,
      restaurantId,
    );

    if (!isOrderable) {
      throw new ForbiddenException('SUPPLIER_NOT_AVAILABLE_FOR_RESTAURANT');
    }
  }

  async isSupplierOrderable(
    supplierId: number,
    restaurantId: number,
  ): Promise<boolean> {
    const supplierCount = await this.prismaService.supplier.count({
      where: {
        id: supplierId,
        ...this.buildOrderableSupplierWhere(restaurantId),
      },
    });

    return supplierCount > 0;
  }

  async createSupplier(dto: CreateSupplierDto): Promise<SupplierListItem> {
    const nextSortOrder = await this.resolveNextSortOrder(dto.sortOrder);

    const supplier = await this.prismaService.supplier.create({
      data: {
        name: dto.name.trim(),
        sortOrder: nextSortOrder,
        includeAllProductsInOrder: dto.includeAllProductsInOrder ?? false,
        orderNotice: normalizeOrderNotice(dto.orderNotice),
        orderNoticeFr: normalizeOrderNotice(dto.orderNoticeFr),
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
        ...(dto.orderNoticeFr !== undefined
          ? { orderNoticeFr: normalizeOrderNotice(dto.orderNoticeFr) }
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

  private buildOrderableSupplierWhere(
    restaurantId: number,
  ): Prisma.SupplierWhereInput {
    return {
      OR: [
        { availableToAllRestaurants: true },
        {
          restaurantAvailabilities: {
            some: { restaurantId },
          },
        },
      ],
    };
  }
}

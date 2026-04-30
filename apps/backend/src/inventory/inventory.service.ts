import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMovementDto } from './dto/create-movement.dto';

export type InventoryLineItem = {
  id: string;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  unit: string | null;
  specification: string | null;
  stock: number;
};

export type InventoryMovementItem = {
  id: string;
  productId: string;
  productNameCn: string;
  productDesignationFr: string | null;
  delta: number;
  reason: string | null;
  source: string;
  sourceId: string | null;
  userId: number | null;
  createdAt: string;
};

// Maps Windows-1252 special characters back to their source byte (legacy mojibake fix).
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

function fixMojibake(value: string): string;
function fixMojibake(value: string | null): string | null;
function fixMojibake(value: string | null): string | null {
  if (value === null || value === '') return value;
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const mapped = CP1252_REVERSE[code];
    bytes[i] = mapped !== undefined ? mapped : code & 0xff;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

@Injectable()
export class InventoryService {
  constructor(private readonly prismaService: PrismaService) {}

  async listInventoryForSupplier(
    supplierId: number,
  ): Promise<InventoryLineItem[]> {
    const products = await this.prismaService.product.findMany({
      where: { supplierId },
      select: {
        id: true,
        supplierId: true,
        reference: true,
        category: true,
        nameCn: true,
        designationFr: true,
        unit: true,
        specification: true,
      },
      orderBy: { id: 'asc' },
    });

    if (products.length === 0) return [];

    const grouped = await this.prismaService.inventoryMovement.groupBy({
      by: ['productId'],
      where: { productId: { in: products.map((p) => p.id) } },
      _sum: { delta: true },
    });

    const stockMap = new Map<string, number>();
    for (const g of grouped) {
      stockMap.set(g.productId.toString(), g._sum.delta ?? 0);
    }

    return products.map((p) => ({
      id: p.id.toString(),
      supplierId: p.supplierId,
      reference: fixMojibake(p.reference),
      category: fixMojibake(p.category),
      nameCn: fixMojibake(p.nameCn),
      designationFr: fixMojibake(p.designationFr),
      unit: fixMojibake(p.unit),
      specification: fixMojibake(p.specification),
      stock: stockMap.get(p.id.toString()) ?? 0,
    }));
  }

  async listMovements(options: {
    productId?: number;
    supplierId?: number;
    limit?: number;
  }): Promise<InventoryMovementItem[]> {
    const where: Record<string, unknown> = {};
    if (options.productId !== undefined) {
      where.productId = BigInt(options.productId);
    }
    if (options.supplierId !== undefined) {
      where.product = { supplierId: options.supplierId };
    }

    const limit = options.limit ?? 50;

    const rows = await this.prismaService.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            nameCn: true,
            designationFr: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id.toString(),
      productId: row.productId.toString(),
      productNameCn: fixMojibake(row.product?.nameCn ?? ''),
      productDesignationFr: fixMojibake(row.product?.designationFr ?? null),
      delta: row.delta,
      reason: fixMojibake(row.reason),
      source: row.source,
      sourceId: row.sourceId,
      userId: row.userId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createMovement(dto: CreateMovementDto): Promise<InventoryMovementItem> {
    if (dto.delta === 0) {
      throw new BadRequestException('DELTA_MUST_BE_NON_ZERO');
    }

    const productId = BigInt(dto.productId);
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      select: { id: true, nameCn: true, designationFr: true },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const created = await this.prismaService.inventoryMovement.create({
      data: {
        productId,
        delta: dto.delta,
        reason: dto.reason ?? null,
        source: dto.source ?? 'manual',
        sourceId: dto.sourceId ?? null,
      },
    });

    return {
      id: created.id.toString(),
      productId: created.productId.toString(),
      productNameCn: fixMojibake(product.nameCn),
      productDesignationFr: fixMojibake(product.designationFr),
      delta: created.delta,
      reason: fixMojibake(created.reason),
      source: created.source,
      sourceId: created.sourceId,
      userId: created.userId,
      createdAt: created.createdAt.toISOString(),
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

export type ProductListItem = {
  id: string;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  unit: string | null;
  unitPriceHt: number | null;
  image: string | null;
  specification: string | null;
  specification2: string | null;
  specification3: string | null;
  unit2: string | null;
  unit3: string | null;
  unitPriceHt2: number | null;
  unitPriceHt3: number | null;
};

function toNullableNumber(value: { toString(): string } | null): number | null {
  if (!value) {
    return null;
  }

  return Number(value);
}

// Maps Windows-1252 special characters (0x80-0x9F) back to their source byte.
// Needed because Buffer.from(s, 'latin1') truncates code points > 0xFF,
// which corrupts characters like €, Š, Ÿ, œ, ™ that arise in double-encoded strings.
const CP1252_REVERSE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function fixMojibake(value: string): string;
function fixMojibake(value: string | null): string | null;
function fixMojibake(value: string | null): string | null {
  if (value === null || value === '') {
    return value;
  }

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

const PRODUCT_SELECT = {
  id: true,
  supplierId: true,
  reference: true,
  category: true,
  nameCn: true,
  designationFr: true,
  unit: true,
  unitPriceHt: true,
  image: true,
  specification: true,
  specification2: true,
  specification3: true,
  unit2: true,
  unit3: true,
  unitPriceHt2: true,
  unitPriceHt3: true,
} as const;

type PrismaProductRow = {
  id: bigint;
  supplierId: number;
  reference: string | null;
  category: string;
  nameCn: string;
  designationFr: string | null;
  unit: string | null;
  unitPriceHt: { toString(): string } | null;
  image: string | null;
  specification: string | null;
  specification2: string | null;
  specification3: string | null;
  unit2: string | null;
  unit3: string | null;
  unitPriceHt2: { toString(): string } | null;
  unitPriceHt3: { toString(): string } | null;
};

function toProductListItem(product: PrismaProductRow): ProductListItem {
  return {
    id: product.id.toString(),
    supplierId: product.supplierId,
    reference: fixMojibake(product.reference),
    category: fixMojibake(product.category),
    nameCn: fixMojibake(product.nameCn),
    designationFr: fixMojibake(product.designationFr),
    unit: fixMojibake(product.unit),
    unitPriceHt: toNullableNumber(product.unitPriceHt),
    image: product.image,
    specification: fixMojibake(product.specification),
    specification2: fixMojibake(product.specification2),
    specification3: fixMojibake(product.specification3),
    unit2: fixMojibake(product.unit2),
    unit3: fixMojibake(product.unit3),
    unitPriceHt2: toNullableNumber(product.unitPriceHt2),
    unitPriceHt3: toNullableNumber(product.unitPriceHt3),
  };
}

function parseProductId(id: string): bigint {
  try {
    return BigInt(id);
  } catch {
    throw new NotFoundException('PRODUCT_NOT_FOUND');
  }
}

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listProductsBySupplier(supplierId: number): Promise<ProductListItem[]> {
    const products = await this.prismaService.product.findMany({
      where: { supplierId },
      select: PRODUCT_SELECT,
      orderBy: { id: 'asc' },
    });

    return products.map(toProductListItem);
  }

  async getProduct(id: string): Promise<ProductListItem> {
    const productId = parseProductId(id);
    const product = await this.prismaService.product.findUnique({
      where: { id: productId },
      select: PRODUCT_SELECT,
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    return toProductListItem(product);
  }

  async createProduct(dto: CreateProductDto): Promise<ProductListItem> {
    await this.assertSupplierExists(dto.supplierId);

    const product = await this.prismaService.product.create({
      data: {
        supplierId: dto.supplierId,
        reference: dto.reference ?? null,
        category: dto.category,
        nameCn: dto.nameCn,
        designationFr: dto.designationFr ?? null,
        unit: dto.unit ?? null,
        unitPriceHt: dto.unitPriceHt ?? null,
        image: dto.image ?? null,
        specification: dto.specification ?? null,
      },
      select: PRODUCT_SELECT,
    });

    return toProductListItem(product);
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductListItem> {
    const productId = parseProductId(id);
    await this.getProduct(id);

    if (dto.supplierId !== undefined) {
      await this.assertSupplierExists(dto.supplierId);
    }

    const product = await this.prismaService.product.update({
      where: { id: productId },
      data: {
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.reference !== undefined ? { reference: dto.reference || null } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.nameCn !== undefined ? { nameCn: dto.nameCn } : {}),
        ...(dto.designationFr !== undefined
          ? { designationFr: dto.designationFr || null }
          : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit || null } : {}),
        ...(dto.unitPriceHt !== undefined
          ? { unitPriceHt: dto.unitPriceHt }
          : {}),
        ...(dto.image !== undefined ? { image: dto.image || null } : {}),
        ...(dto.specification !== undefined
          ? { specification: dto.specification || null }
          : {}),
      },
      select: PRODUCT_SELECT,
    });

    return toProductListItem(product);
  }

  async deleteProduct(id: string): Promise<void> {
    const productId = parseProductId(id);
    await this.getProduct(id);
    await this.prismaService.product.delete({ where: { id: productId } });
  }

  private async assertSupplierExists(supplierId: number): Promise<void> {
    const supplier = await this.prismaService.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException('SUPPLIER_NOT_FOUND');
    }
  }
}

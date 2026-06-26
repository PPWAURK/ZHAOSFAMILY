import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { renameSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersDocumentService } from './orders-document.service';
import type { CreateOrderReturnDto } from './dto/create-order-return.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { UpdateOrderDto } from './dto/update-order.dto';
import type { OrderDocumentItem, OrdersRequestContext } from './orders.types';

type OrderActor = {
  id: number;
  restaurantId: number;
  jobRole?: string | null;
  permissions?: string[];
};

type ProductOrderStatItem = {
  productId: string;
  nameZh: string;
  nameFr: string | null;
  unit: string | null;
  category: string;
  totalQuantity: number;
  totalAmount: number;
  orderLineCount: number;
};

type SupplierOrderStatGroup = {
  supplierId: number;
  supplierName: string;
  totalQuantity: number;
  totalAmount: number;
  items: ProductOrderStatItem[];
};

type ProductOrderStats = {
  from: string | null;
  to: string | null;
  restaurantId: number | null;
  canViewAllStores: boolean;
  stores: { id: number; name: string }[];
  totalProducts: number;
  totalQuantity: number;
  totalAmount: number;
  suppliers: SupplierOrderStatGroup[];
};

type OrderProduct = {
  id: bigint;
  supplierId: number;
  category: string;
  nameCn: string;
  designationFr: string | null;
  specification: string | null;
  specification2: string | null;
  specification3: string | null;
  unit: string | null;
  unit2: string | null;
  unit3: string | null;
  unitPriceHt: Prisma.Decimal | number | null;
  unitPriceHt2: Prisma.Decimal | number | null;
  unitPriceHt3: Prisma.Decimal | number | null;
};

type ProductSpecification = {
  slot: number | null;
  specification: string | null;
  unit: string | null;
  unitPrice: number;
};

type PreparedOrderItem = {
  product: OrderProduct;
  quantity: number;
  specificationSlot: number | null;
  specification: string | null;
  unit: string | null;
  unitPrice: number;
  lineTotal: number;
};

type ExistingOrderItemQuantity = {
  productId: bigint;
  quantity: number;
};

const STOCK_ENFORCED_SUPPLIER_IDS = new Set([8]);

@Injectable()
export class OrdersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly ordersDocumentService: OrdersDocumentService,
  ) {}

  async createOrder(
    actor: OrderActor,
    dto: CreateOrderDto,
    request: OrdersRequestContext,
  ): Promise<unknown> {
    const deliveryDate = this.parseDeliveryDate(dto.deliveryDate);
    const selectedItems = await this.prepareSelectedItems(dto.items);
    const supplierId = this.resolveSingleSupplierId(selectedItems);
    const [supplier, restaurant] = await Promise.all([
      this.prismaService.supplier.findUnique({ where: { id: supplierId } }),
      this.prismaService.restaurant.findUnique({
        where: { id: actor.restaurantId },
      }),
    ]);

    if (!supplier) {
      throw new NotFoundException('SUPPLIER_NOT_FOUND');
    }

    if (!restaurant) {
      throw new NotFoundException('RESTAURANT_NOT_FOUND');
    }

    await this.assertStockAvailable(supplierId, selectedItems);

    const orderItems = supplier.includeAllProductsInOrder
      ? await this.prepareSupplierCatalogItems(supplierId, selectedItems)
      : selectedItems;
    const totals = this.calculateTotals(orderItems);
    const pdfItems = orderItems.map((item) => this.toOrderDocumentItem(item));
    let generatedOrderFilePath: string | null = null;

    try {
      const createdOrder = await this.prismaService.$transaction(async (tx) => {
        const draftOrder = await tx.purchaseOrder.create({
          data: {
            number: `PO-TMP-${Date.now()}`,
            supplierId,
            restaurantId: actor.restaurantId,
            createdByUserId: actor.id,
            deliveryDate,
            deliveryAddress: restaurant.address,
            totalItems: totals.totalItems,
            totalAmount: totals.totalAmount,
            bonFileName: 'pending.pdf',
          },
        });
        const orderNumber = this.buildOrderNumber(
          draftOrder.id,
          draftOrder.createdAt,
        );
        const orderFileName = this.buildOrderFileName(
          restaurant.name,
          dto.deliveryDate,
        );

        await tx.purchaseOrder.update({
          where: { id: draftOrder.id },
          data: {
            number: orderNumber,
            bonFileName: orderFileName,
          },
        });

        await tx.purchaseOrderItem.createMany({
          data: orderItems.map((item) => ({
            purchaseOrderId: draftOrder.id,
            productId: item.product.id,
            supplierId,
            specificationSlot: item.specificationSlot,
            quantity: item.quantity,
            unitPriceHt: item.unitPrice,
            lineTotal: item.lineTotal,
            nameZh: item.product.nameCn,
            nameFr: item.product.designationFr,
            specification: item.specification,
            unit: item.unit,
            category: item.product.category,
          })),
        });

        if (this.isStockEnforcedSupplier(supplierId)) {
          await this.createOrderInventoryMovements(
            tx,
            draftOrder.id,
            actor.id,
            selectedItems,
          );
        }

        generatedOrderFilePath =
          this.ordersDocumentService.buildOrderFilePath(orderFileName);

        await this.ordersDocumentService.generateCommandePdf({
          filePath: generatedOrderFilePath,
          orderNumber,
          supplierName: supplier.name,
          restaurantName: restaurant.name,
          deliveryDate: dto.deliveryDate,
          deliveryAddress: restaurant.address,
          items: pdfItems,
          totalItems: totals.totalItems,
          totalAmount: totals.totalAmount,
        });

        return {
          id: draftOrder.id,
          number: orderNumber,
          createdAt: draftOrder.createdAt,
        };
      });

      const commandeUrl = this.ordersDocumentService.buildOrderUrl(
        request,
        createdOrder.id,
      );

      return {
        id: createdOrder.id,
        number: createdOrder.number,
        supplierId,
        supplierName: supplier.name,
        restaurantId: actor.restaurantId,
        restaurantName: restaurant.name,
        deliveryDate: dto.deliveryDate,
        deliveryAddress: restaurant.address,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
        commandeUrl,
        bonUrl: commandeUrl,
        createdAt: createdOrder.createdAt.toISOString(),
      };
    } catch (error) {
      this.ordersDocumentService.deleteFileIfExists(generatedOrderFilePath);
      throw error;
    }
  }

  async listOrders(
    actor: OrderActor,
    request: OrdersRequestContext,
  ): Promise<unknown[]> {
    const canViewAllStores = this.hasHoldingScope(actor);
    const where: Prisma.PurchaseOrderWhereInput = canViewAllStores
      ? {}
      : { restaurantId: actor.restaurantId };

    const orders = await this.prismaService.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        returns: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    return orders.map((order) => {
      const canManageOrder = this.canManageRestaurantOrder(
        actor,
        order.restaurantId,
      );
      const commandeUrl = this.ordersDocumentService.buildOrderUrl(
        request,
        order.id,
      );

      return {
        id: order.id,
        number: order.number,
        supplierId: order.supplierId,
        supplierName: order.supplier.name,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurant.name,
        deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
        deliveryAddress: order.deliveryAddress,
        totalItems: order.totalItems,
        totalAmount: Number(order.totalAmount),
        commandeUrl,
        bonUrl: commandeUrl,
        createdAt: order.createdAt.toISOString(),
        canEdit: canManageOrder && order.returns.length === 0,
        canReturn: canManageOrder,
        canDelete: canManageOrder && order.returns.length === 0,
        returnCount: order.returns.length,
        createdBy: {
          id: order.createdByUser.id,
          name: order.createdByUser.name,
          email: order.createdByUser.email,
        },
      };
    });
  }

  private hasHoldingScope(actor: OrderActor): boolean {
    const roles = `${actor.jobRole ?? ''}`
      .split(',')
      .map((role) => role.trim());

    return (
      roles.includes('holding') ||
      (actor.permissions ?? []).includes('system.permission.manage')
    );
  }

  async getProductOrderStats(
    actor: OrderActor,
    query: { from?: string; to?: string; restaurantId?: number },
  ): Promise<ProductOrderStats> {
    const canViewAllStores = this.hasHoldingScope(actor);
    // A store user is always pinned to their own restaurant; only holding may
    // target another store (or all stores when no restaurantId is given).
    const targetRestaurantId = canViewAllStores
      ? (query.restaurantId ?? null)
      : actor.restaurantId;

    const createdAt: Prisma.DateTimeFilter = {};
    if (query.from) {
      createdAt.gte = new Date(query.from);
    }
    if (query.to) {
      const toDate = new Date(query.to);
      // A date-only bound (YYYY-MM-DD) should include the whole day.
      if (/^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      createdAt.lte = toDate;
    }

    const where: Prisma.PurchaseOrderItemWhereInput = {
      purchaseOrder: {
        ...(targetRestaurantId !== null
          ? { restaurantId: targetRestaurantId }
          : {}),
        ...(query.from || query.to ? { createdAt } : {}),
      },
    };

    const [grouped, names, stores] = await Promise.all([
      this.prismaService.purchaseOrderItem.groupBy({
        by: ['supplierId', 'productId'],
        where,
        _sum: { quantity: true, lineTotal: true },
        _count: { _all: true },
      }),
      this.prismaService.purchaseOrderItem.findMany({
        where,
        distinct: ['productId'],
        select: {
          productId: true,
          nameZh: true,
          nameFr: true,
          unit: true,
          category: true,
        },
      }),
      canViewAllStores
        ? this.prismaService.restaurant.findMany({
            select: { id: true, name: true },
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const nameByProductId = new Map(
      names.map((row) => [row.productId.toString(), row]),
    );
    const supplierIds = [...new Set(grouped.map((row) => row.supplierId))];
    const suppliers = await this.prismaService.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierNameById = new Map(
      suppliers.map((row) => [row.id, row.name]),
    );

    const groupsBySupplier = new Map<number, SupplierOrderStatGroup>();
    for (const row of grouped) {
      const meta = nameByProductId.get(row.productId.toString());
      const item: ProductOrderStatItem = {
        productId: row.productId.toString(),
        nameZh: meta?.nameZh ?? '',
        nameFr: meta?.nameFr ?? null,
        unit: meta?.unit ?? null,
        category: meta?.category ?? '',
        totalQuantity: row._sum.quantity ?? 0,
        totalAmount: Number(row._sum.lineTotal ?? 0),
        orderLineCount: row._count._all,
      };
      const group =
        groupsBySupplier.get(row.supplierId) ??
        groupsBySupplier
          .set(row.supplierId, {
            supplierId: row.supplierId,
            supplierName:
              supplierNameById.get(row.supplierId) ?? `#${row.supplierId}`,
            totalQuantity: 0,
            totalAmount: 0,
            items: [],
          })
          .get(row.supplierId)!;
      group.items.push(item);
      group.totalQuantity += item.totalQuantity;
      group.totalAmount += item.totalAmount;
    }

    const supplierGroups = [...groupsBySupplier.values()]
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (left, right) => right.totalAmount - left.totalAmount,
        ),
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount);

    return {
      from: query.from ?? null,
      to: query.to ?? null,
      restaurantId: targetRestaurantId,
      canViewAllStores,
      stores,
      totalProducts: nameByProductId.size,
      totalQuantity: supplierGroups.reduce(
        (sum, group) => sum + group.totalQuantity,
        0,
      ),
      totalAmount: supplierGroups.reduce(
        (sum, group) => sum + group.totalAmount,
        0,
      ),
      suppliers: supplierGroups,
    };
  }

  async getOrder(
    orderId: number,
    actor: OrderActor,
    request: OrdersRequestContext,
  ): Promise<unknown> {
    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        returns: { select: { id: true } },
        items: {
          where: { quantity: { gt: 0 } },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantReadScope(actor, order.restaurantId);

    const commandeUrl = this.ordersDocumentService.buildOrderUrl(
      request,
      order.id,
    );

    return {
      id: order.id,
      number: order.number,
      supplierId: order.supplierId,
      supplierName: order.supplier.name,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant.name,
      deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
      deliveryAddress: order.deliveryAddress,
      totalItems: order.totalItems,
      totalAmount: Number(order.totalAmount),
      commandeUrl,
      bonUrl: commandeUrl,
      createdAt: order.createdAt.toISOString(),
      canEdit: order.returns.length === 0,
      returnCount: order.returns.length,
      createdBy: {
        id: order.createdByUser.id,
        name: order.createdByUser.name,
        email: order.createdByUser.email,
      },
      items: order.items.map((item) => ({
        purchaseOrderItemId: item.id,
        productId: item.productId.toString(),
        specificationSlot: item.specificationSlot,
        quantity: item.quantity,
        nameZh: this.ordersDocumentService.sanitizeLabel(item.nameZh),
        nameFr: this.ordersDocumentService.sanitizeLabel(item.nameFr),
        specification: this.ordersDocumentService.sanitizeLabel(
          item.specification,
        ),
        unit: this.ordersDocumentService.sanitizeLabel(item.unit),
        category: item.category,
      })),
    };
  }

  async updateOrder(
    orderId: number,
    actor: OrderActor,
    dto: UpdateOrderDto,
    request: OrdersRequestContext,
  ): Promise<unknown> {
    const deliveryDate = this.parseDeliveryDate(dto.deliveryDate);
    const selectedItems = await this.prepareSelectedItems(dto.items);
    const supplierId = this.resolveSingleSupplierId(selectedItems);
    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: {
          select: { id: true, name: true, includeAllProductsInOrder: true },
        },
        restaurant: { select: { id: true, name: true, address: true } },
        returns: { select: { id: true }, take: 1 },
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantScope(actor, order.restaurantId);

    if (order.returns.length > 0) {
      throw new BadRequestException('ORDER_WITH_RETURNS_CANNOT_BE_UPDATED');
    }

    if (supplierId !== order.supplierId) {
      throw new BadRequestException('ORDER_SUPPLIER_CANNOT_CHANGE');
    }

    await this.assertStockAvailableForUpdate(
      supplierId,
      selectedItems,
      order.items,
    );

    const orderItems = order.supplier.includeAllProductsInOrder
      ? await this.prepareSupplierCatalogItems(supplierId, selectedItems)
      : selectedItems;
    const totals = this.calculateTotals(orderItems);
    const pdfItems = orderItems.map((item) => this.toOrderDocumentItem(item));
    const oldOrderFilePath = this.ordersDocumentService.buildOrderFilePath(
      order.bonFileName,
    );
    const orderFileName = this.buildOrderFileName(
      order.restaurant.name,
      dto.deliveryDate,
    );
    const newOrderFilePath =
      this.ordersDocumentService.buildOrderFilePath(orderFileName);
    const temporaryOrderFilePath = `${newOrderFilePath}.tmp-${Date.now()}`;
    let generatedOrderFilePath: string | null = null;

    try {
      await this.prismaService.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id: orderId },
          data: {
            deliveryDate,
            deliveryAddress: order.restaurant.address,
            totalItems: totals.totalItems,
            totalAmount: totals.totalAmount,
            bonFileName: orderFileName,
          },
        });

        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: orderId },
        });

        await tx.purchaseOrderItem.createMany({
          data: orderItems.map((item) => ({
            purchaseOrderId: orderId,
            productId: item.product.id,
            supplierId,
            specificationSlot: item.specificationSlot,
            quantity: item.quantity,
            unitPriceHt: item.unitPrice,
            lineTotal: item.lineTotal,
            nameZh: item.product.nameCn,
            nameFr: item.product.designationFr,
            specification: item.specification,
            unit: item.unit,
            category: item.product.category,
          })),
        });

        if (this.isStockEnforcedSupplier(supplierId)) {
          await this.createOrderUpdateInventoryMovements(
            tx,
            orderId,
            actor.id,
            order.items,
            selectedItems,
          );
        }

        generatedOrderFilePath = temporaryOrderFilePath;
        await this.ordersDocumentService.generateCommandePdf({
          filePath: temporaryOrderFilePath,
          orderNumber: order.number,
          supplierName: order.supplier.name,
          restaurantName: order.restaurant.name,
          deliveryDate: dto.deliveryDate,
          deliveryAddress: order.restaurant.address,
          items: pdfItems,
          totalItems: totals.totalItems,
          totalAmount: totals.totalAmount,
        });
        renameSync(temporaryOrderFilePath, newOrderFilePath);
        generatedOrderFilePath = newOrderFilePath;
      });

      if (oldOrderFilePath !== newOrderFilePath) {
        this.ordersDocumentService.deleteFileIfExists(oldOrderFilePath);
      }

      const commandeUrl = this.ordersDocumentService.buildOrderUrl(
        request,
        orderId,
      );

      return {
        id: orderId,
        number: order.number,
        supplierId,
        supplierName: order.supplier.name,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurant.name,
        deliveryDate: dto.deliveryDate,
        deliveryAddress: order.restaurant.address,
        totalItems: totals.totalItems,
        totalAmount: totals.totalAmount,
        commandeUrl,
        bonUrl: commandeUrl,
        createdAt: order.createdAt.toISOString(),
        canEdit: true,
        returnCount: 0,
      };
    } catch (error) {
      if (
        generatedOrderFilePath !== oldOrderFilePath &&
        generatedOrderFilePath !== newOrderFilePath
      ) {
        this.ordersDocumentService.deleteFileIfExists(generatedOrderFilePath);
      }
      throw error;
    }
  }

  async listOrderReturns(actor: OrderActor): Promise<unknown[]> {
    const where: Prisma.PurchaseReturnWhereInput = this.hasHoldingScope(actor)
      ? {}
      : { restaurantId: actor.restaurantId };

    const returns = await this.prismaService.purchaseReturn.findMany({
      where,
      include: {
        purchaseOrder: {
          select: { id: true, number: true, deliveryDate: true },
        },
        supplier: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
        items: { orderBy: { id: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
    });

    return returns.map((entry) => ({
      id: entry.id,
      orderId: entry.purchaseOrderId,
      orderNumber: entry.purchaseOrder.number,
      supplierId: entry.supplierId,
      supplierName: entry.supplier.name,
      restaurantId: entry.restaurantId,
      restaurantName: entry.restaurant.name,
      deliveryDate: entry.purchaseOrder.deliveryDate.toISOString().slice(0, 10),
      reason: entry.reason,
      notes: entry.notes ?? '',
      totalItems: entry.totalItems,
      createdAt: entry.createdAt.toISOString(),
      items: entry.items.map((item) => ({
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId.toString(),
        specificationSlot: item.specificationSlot,
        quantity: item.quantity,
        nameZh: this.ordersDocumentService.sanitizeLabel(item.nameZh),
        nameFr: this.ordersDocumentService.sanitizeLabel(item.nameFr),
        specification: this.ordersDocumentService.sanitizeLabel(
          item.specification,
        ),
        unit: this.ordersDocumentService.sanitizeLabel(item.unit),
        category: item.category,
      })),
    }));
  }

  async getOrderReturnDraft(
    orderId: number,
    actor: OrderActor,
  ): Promise<unknown> {
    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          where: { quantity: { gt: 0 } },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantReadScope(actor, order.restaurantId);

    const returnedItems = await this.prismaService.purchaseReturnItem.findMany({
      where: { purchaseReturn: { purchaseOrderId: orderId } },
      select: { purchaseOrderItemId: true, quantity: true },
    });
    const returnedQuantityByItemId = this.sumReturnedQuantities(returnedItems);

    return {
      orderId: order.id,
      orderNumber: order.number,
      supplierId: order.supplierId,
      supplierName: order.supplier.name,
      deliveryDate: order.deliveryDate.toISOString().slice(0, 10),
      items: order.items.map((item) => {
        const returnedQuantity = returnedQuantityByItemId.get(item.id) ?? 0;

        return {
          purchaseOrderItemId: item.id,
          productId: item.productId.toString(),
          specificationSlot: item.specificationSlot,
          category: item.category,
          nameZh: this.ordersDocumentService.sanitizeLabel(item.nameZh),
          nameFr: this.ordersDocumentService.sanitizeLabel(item.nameFr),
          specification: this.ordersDocumentService.sanitizeLabel(
            item.specification,
          ),
          unit: this.ordersDocumentService.sanitizeLabel(item.unit),
          orderedQuantity: item.quantity,
          returnedQuantity,
          remainingQuantity: Math.max(item.quantity - returnedQuantity, 0),
        };
      }),
    };
  }

  async createOrderReturn(
    actor: OrderActor,
    dto: CreateOrderReturnDto,
  ): Promise<unknown> {
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('RETURN_REASON_REQUIRED');
    }

    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: dto.orderId },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { orderBy: { id: 'asc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantScope(actor, order.restaurantId);

    const orderItemById = new Map(order.items.map((item) => [item.id, item]));
    const returnedItems = await this.prismaService.purchaseReturnItem.findMany({
      where: { purchaseReturn: { purchaseOrderId: order.id } },
      select: { purchaseOrderItemId: true, quantity: true },
    });
    const returnedQuantityByItemId = this.sumReturnedQuantities(returnedItems);
    const normalizedItems = dto.items.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      quantity: item.quantity,
    }));

    if (
      new Set(normalizedItems.map((item) => item.purchaseOrderItemId)).size !==
      normalizedItems.length
    ) {
      throw new BadRequestException('DUPLICATE_RETURN_ITEM');
    }

    const preparedItems = normalizedItems.map((item) => {
      const orderItem = orderItemById.get(item.purchaseOrderItemId);

      if (!orderItem) {
        throw new BadRequestException('RETURN_ITEM_NOT_IN_ORDER');
      }

      const alreadyReturned = returnedQuantityByItemId.get(orderItem.id) ?? 0;
      const remainingQuantity = orderItem.quantity - alreadyReturned;

      if (item.quantity > remainingQuantity) {
        throw new BadRequestException('RETURN_QUANTITY_EXCEEDS_REMAINING');
      }

      return { orderItem, quantity: item.quantity };
    });
    const totalItems = preparedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    if (totalItems <= 0) {
      throw new BadRequestException('RETURN_ITEMS_REQUIRED');
    }

    const created = await this.prismaService.purchaseReturn.create({
      data: {
        purchaseOrderId: order.id,
        supplierId: order.supplierId,
        restaurantId: order.restaurantId,
        createdByUserId: actor.id,
        reason,
        notes: dto.notes?.trim() || null,
        totalItems,
        items: {
          create: preparedItems.map(({ orderItem, quantity }) => ({
            purchaseOrderItemId: orderItem.id,
            productId: orderItem.productId,
            specificationSlot: orderItem.specificationSlot,
            quantity,
            nameZh: orderItem.nameZh,
            nameFr: orderItem.nameFr,
            specification: orderItem.specification,
            unit: orderItem.unit,
            category: orderItem.category,
          })),
        },
      },
    });

    return {
      id: created.id,
      orderId: order.id,
      orderNumber: order.number,
      supplierId: order.supplierId,
      supplierName: order.supplier.name,
      reason: created.reason,
      notes: created.notes ?? '',
      totalItems: created.totalItems,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async deleteOrderReturn(
    returnId: number,
    actor: OrderActor,
  ): Promise<{ success: true; id: number }> {
    const existingReturn = await this.prismaService.purchaseReturn.findUnique({
      where: { id: returnId },
      select: { id: true, restaurantId: true },
    });

    if (!existingReturn) {
      return { success: true, id: returnId };
    }

    this.assertRestaurantScope(actor, existingReturn.restaurantId);
    await this.prismaService.purchaseReturn.delete({ where: { id: returnId } });

    return { success: true, id: returnId };
  }

  async deleteOrder(
    orderId: number,
    actor: OrderActor,
  ): Promise<{ success: true; id: number }> {
    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        returns: { select: { id: true }, take: 1 },
        items: { select: { productId: true, quantity: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantScope(actor, order.restaurantId);

    if (order.returns.length > 0) {
      throw new BadRequestException('ORDER_WITH_RETURNS_CANNOT_BE_DELETED');
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.purchaseOrder.delete({ where: { id: orderId } });

      if (!this.isStockEnforcedSupplier(order.supplierId)) {
        return;
      }

      const itemsToRestore = order.items.filter((item) => item.quantity > 0);
      if (itemsToRestore.length === 0) {
        return;
      }

      await tx.inventoryMovement.createMany({
        data: itemsToRestore.map((item) => ({
          productId: item.productId,
          delta: item.quantity,
          reason: 'Order deleted',
          source: 'order-delete',
          sourceId: String(orderId),
          userId: actor.id,
        })),
      });
    });

    this.ordersDocumentService.deleteFileIfExists(
      this.ordersDocumentService.buildOrderFilePath(order.bonFileName),
    );

    return { success: true, id: orderId };
  }

  async resolveOrderFilePath(
    orderId: number,
    actor: OrderActor,
  ): Promise<string> {
    const order = await this.prismaService.purchaseOrder.findUnique({
      where: { id: orderId },
      select: {
        restaurantId: true,
        bonFileName: true,
      },
    });

    if (!order) {
      throw new NotFoundException('ORDER_NOT_FOUND');
    }

    this.assertRestaurantReadScope(actor, order.restaurantId);

    return this.ordersDocumentService.resolveExistingOrderFile(
      order.bonFileName,
    );
  }

  private async prepareSelectedItems(
    items: CreateOrderDto['items'],
  ): Promise<PreparedOrderItem[]> {
    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      specificationSlot: item.specificationSlot ?? null,
    }));
    const productIds = Array.from(
      new Set(normalizedItems.map((item) => item.productId)),
    );
    const products = await this.prismaService.product.findMany({
      where: { id: { in: productIds.map((id) => BigInt(id)) } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('SOME_PRODUCTS_NOT_FOUND');
    }

    const productById = new Map(
      products.map((product) => [Number(product.id), product]),
    );

    return normalizedItems.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new BadRequestException('PRODUCT_NOT_FOUND');
      }

      return this.prepareOrderItem(
        product,
        item.quantity,
        item.specificationSlot,
      );
    });
  }

  private prepareOrderItem(
    product: OrderProduct,
    quantity: number,
    specificationSlot: number | null,
  ): PreparedOrderItem {
    const selectedSpecification = this.resolveSelectedSpecification(
      product,
      specificationSlot,
    );

    return {
      product,
      quantity,
      specificationSlot: selectedSpecification.slot,
      specification: selectedSpecification.specification,
      unit: selectedSpecification.unit,
      unitPrice: selectedSpecification.unitPrice,
      lineTotal: selectedSpecification.unitPrice * quantity,
    };
  }

  private async prepareSupplierCatalogItems(
    supplierId: number,
    selectedItems: PreparedOrderItem[],
  ): Promise<PreparedOrderItem[]> {
    const products = await this.prismaService.product.findMany({
      where: { supplierId },
      orderBy: { id: 'asc' },
    });
    const selectedByKey = new Map(
      selectedItems.map((item) => [
        this.buildOrderItemKey(Number(item.product.id), item.specificationSlot),
        item,
      ]),
    );
    const catalogItems: PreparedOrderItem[] = [];

    for (const product of products) {
      for (const specification of this.listDocumentSpecifications(product)) {
        const key = this.buildOrderItemKey(
          Number(product.id),
          specification.slot,
        );
        const selectedItem = selectedByKey.get(key);

        catalogItems.push(
          selectedItem ?? {
            product,
            quantity: 0,
            specificationSlot: specification.slot,
            specification: specification.specification,
            unit: specification.unit,
            unitPrice: specification.unitPrice,
            lineTotal: 0,
          },
        );
      }
    }

    return catalogItems;
  }

  private resolveSingleSupplierId(items: PreparedOrderItem[]): number {
    const supplierIds = new Set(items.map((item) => item.product.supplierId));

    if (supplierIds.size !== 1) {
      throw new BadRequestException('ORDER_MUST_USE_ONE_SUPPLIER');
    }

    return [...supplierIds][0];
  }

  private async assertStockAvailable(
    supplierId: number,
    selectedItems: PreparedOrderItem[],
  ): Promise<void> {
    if (!this.isStockEnforcedSupplier(supplierId)) {
      return;
    }

    const requestedByProductId = this.sumQuantitiesByProductId(selectedItems);
    const productIds = [...requestedByProductId.keys()].map((id) => BigInt(id));
    const stockRows = await this.prismaService.inventoryMovement.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { delta: true },
    });
    const stockByProductId = new Map(
      stockRows.map((row) => [row.productId.toString(), row._sum.delta ?? 0]),
    );

    for (const [productId, requestedQuantity] of requestedByProductId) {
      const stock = stockByProductId.get(productId) ?? 0;
      if (requestedQuantity > stock) {
        throw new BadRequestException('INSUFFICIENT_STOCK');
      }
    }
  }

  private async assertStockAvailableForUpdate(
    supplierId: number,
    selectedItems: PreparedOrderItem[],
    originalItems: ExistingOrderItemQuantity[],
  ): Promise<void> {
    if (!this.isStockEnforcedSupplier(supplierId)) {
      return;
    }

    const requestedByProductId = this.sumQuantitiesByProductId(selectedItems);
    const originalByProductId =
      this.sumExistingQuantitiesByProductId(originalItems);
    const productIds = Array.from(
      new Set([...requestedByProductId.keys(), ...originalByProductId.keys()]),
    );
    const stockRows = await this.prismaService.inventoryMovement.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds.map((id) => BigInt(id)) } },
      _sum: { delta: true },
    });
    const stockByProductId = new Map(
      stockRows.map((row) => [row.productId.toString(), row._sum.delta ?? 0]),
    );

    for (const [productId, requestedQuantity] of requestedByProductId) {
      const currentStock = stockByProductId.get(productId) ?? 0;
      const originalQuantity = originalByProductId.get(productId) ?? 0;
      if (requestedQuantity > currentStock + originalQuantity) {
        throw new BadRequestException('INSUFFICIENT_STOCK');
      }
    }
  }

  private async createOrderInventoryMovements(
    tx: Prisma.TransactionClient,
    orderId: number,
    userId: number,
    selectedItems: PreparedOrderItem[],
  ): Promise<void> {
    const requestedByProductId = this.sumQuantitiesByProductId(selectedItems);

    await tx.inventoryMovement.createMany({
      data: [...requestedByProductId.entries()].map(
        ([productId, quantity]) => ({
          productId: BigInt(productId),
          delta: -quantity,
          reason: 'Purchase order created',
          source: 'order',
          sourceId: String(orderId),
          userId,
        }),
      ),
    });
  }

  private async createOrderUpdateInventoryMovements(
    tx: Prisma.TransactionClient,
    orderId: number,
    userId: number,
    originalItems: ExistingOrderItemQuantity[],
    selectedItems: PreparedOrderItem[],
  ): Promise<void> {
    const originalByProductId =
      this.sumExistingQuantitiesByProductId(originalItems);
    const requestedByProductId = this.sumQuantitiesByProductId(selectedItems);
    const productIds = Array.from(
      new Set([...originalByProductId.keys(), ...requestedByProductId.keys()]),
    );
    const movements = productIds
      .map((productId) => ({
        productId: BigInt(productId),
        delta:
          (originalByProductId.get(productId) ?? 0) -
          (requestedByProductId.get(productId) ?? 0),
        reason: 'Purchase order updated',
        source: 'order-update',
        sourceId: String(orderId),
        userId,
      }))
      .filter((movement) => movement.delta !== 0);

    if (movements.length === 0) {
      return;
    }

    await tx.inventoryMovement.createMany({ data: movements });
  }

  private sumQuantitiesByProductId(
    items: PreparedOrderItem[],
  ): Map<string, number> {
    const quantities = new Map<string, number>();

    for (const item of items) {
      if (item.quantity <= 0) {
        continue;
      }

      const productId = item.product.id.toString();
      quantities.set(
        productId,
        (quantities.get(productId) ?? 0) + item.quantity,
      );
    }

    return quantities;
  }

  private sumExistingQuantitiesByProductId(
    items: ExistingOrderItemQuantity[],
  ): Map<string, number> {
    const quantities = new Map<string, number>();

    for (const item of items) {
      if (item.quantity <= 0) {
        continue;
      }

      const productId = item.productId.toString();
      quantities.set(
        productId,
        (quantities.get(productId) ?? 0) + item.quantity,
      );
    }

    return quantities;
  }

  private listDocumentSpecifications(
    product: OrderProduct,
  ): ProductSpecification[] {
    const selectable = this.listSelectableSpecifications(product);
    const hasMultipleChoices = selectable.some((entry) => entry.slot !== 1);

    if (hasMultipleChoices) {
      return selectable;
    }

    return [
      {
        slot: this.normalizeText(product.specification) ? 1 : null,
        specification: this.normalizeText(product.specification),
        unit: this.normalizeText(product.unit),
        unitPrice: this.toNumber(product.unitPriceHt),
      },
    ];
  }

  private resolveSelectedSpecification(
    product: OrderProduct,
    specificationSlot: number | null,
  ): ProductSpecification {
    const selectable = this.listSelectableSpecifications(product);
    const hasMultipleChoices = selectable.some((entry) => entry.slot !== 1);

    if (!hasMultipleChoices) {
      if (specificationSlot !== null && specificationSlot !== 1) {
        throw new BadRequestException('SPECIFICATION_NOT_FOUND');
      }

      return {
        slot: this.normalizeText(product.specification) ? 1 : null,
        specification: this.normalizeText(product.specification),
        unit: this.normalizeText(product.unit),
        unitPrice: this.toNumber(product.unitPriceHt),
      };
    }

    if (specificationSlot === null) {
      throw new BadRequestException('SPECIFICATION_SLOT_REQUIRED');
    }

    const selected = selectable.find(
      (entry) => entry.slot === specificationSlot,
    );

    if (!selected) {
      throw new BadRequestException('SPECIFICATION_NOT_FOUND');
    }

    return selected;
  }

  private listSelectableSpecifications(
    product: OrderProduct,
  ): ProductSpecification[] {
    return [
      {
        slot: 1,
        specification: this.normalizeText(product.specification),
        unit: this.normalizeText(product.unit),
        unitPrice: this.toNumber(product.unitPriceHt),
      },
      {
        slot: 2,
        specification: this.normalizeText(product.specification2),
        unit: this.normalizeText(product.unit2),
        unitPrice: this.toNumber(product.unitPriceHt2),
      },
      {
        slot: 3,
        specification: this.normalizeText(product.specification3),
        unit: this.normalizeText(product.unit3),
        unitPrice: this.toNumber(product.unitPriceHt3),
      },
    ].filter(
      (entry) =>
        entry.specification !== null ||
        entry.unit !== null ||
        entry.unitPrice > 0,
    );
  }

  private toOrderDocumentItem(item: PreparedOrderItem): OrderDocumentItem {
    const nameFrRaw = this.ordersDocumentService.sanitizeLabel(
      item.product.designationFr ?? item.product.nameCn,
    );
    const nameFr =
      this.ordersDocumentService.makeFrLabel(nameFrRaw) || nameFrRaw;

    return {
      nameFr,
      nameZh: this.ordersDocumentService.sanitizeLabel(item.product.nameCn),
      specification: this.ordersDocumentService.sanitizeLabel(
        item.specification,
      ),
      unit: this.ordersDocumentService.sanitizeLabel(item.unit),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    };
  }

  private calculateTotals(items: PreparedOrderItem[]): {
    totalItems: number;
    totalAmount: number;
  } {
    return {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: Number(
        items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      ),
    };
  }

  private sumReturnedQuantities(
    items: Array<{ purchaseOrderItemId: number; quantity: number }>,
  ): Map<number, number> {
    const returnedQuantityByItemId = new Map<number, number>();

    for (const item of items) {
      returnedQuantityByItemId.set(
        item.purchaseOrderItemId,
        (returnedQuantityByItemId.get(item.purchaseOrderItemId) ?? 0) +
          item.quantity,
      );
    }

    return returnedQuantityByItemId;
  }

  private assertRestaurantScope(actor: OrderActor, restaurantId: number): void {
    if (!this.canManageRestaurantOrder(actor, restaurantId)) {
      throw new ForbiddenException('ORDER_OUTSIDE_RESTAURANT_SCOPE');
    }
  }

  private assertRestaurantReadScope(
    actor: OrderActor,
    restaurantId: number,
  ): void {
    if (
      !this.hasHoldingScope(actor) &&
      !this.canManageRestaurantOrder(actor, restaurantId)
    ) {
      throw new ForbiddenException('ORDER_OUTSIDE_RESTAURANT_SCOPE');
    }
  }

  private canManageRestaurantOrder(
    actor: OrderActor,
    restaurantId: number,
  ): boolean {
    return actor.restaurantId === restaurantId;
  }

  private parseDeliveryDate(raw: string): Date {
    const parsed = new Date(`${raw}T00:00:00.000Z`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('INVALID_DELIVERY_DATE');
    }

    return parsed;
  }

  private buildOrderNumber(orderId: number, createdAt: Date): string {
    const year = createdAt.getFullYear();
    const month = String(createdAt.getMonth() + 1).padStart(2, '0');
    const day = String(createdAt.getDate()).padStart(2, '0');

    return `PO-${year}${month}${day}-${String(orderId).padStart(4, '0')}`;
  }

  private buildOrderFileName(
    restaurantName: string,
    deliveryDate: string,
  ): string {
    const safeRestaurantName =
      restaurantName.replace(/[/\\?%*:|"<>]/g, '').trim() || 'restaurant';

    return `${safeRestaurantName} ${deliveryDate}.pdf`;
  }

  private buildOrderItemKey(
    productId: number,
    specificationSlot: number | null,
  ): string {
    return `${productId}:${specificationSlot ?? 'base'}`;
  }

  private isStockEnforcedSupplier(supplierId: number): boolean {
    return STOCK_ENFORCED_SUPPLIER_IDS.has(supplierId);
  }

  private normalizeText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private toNumber(value: Prisma.Decimal | number | null): number {
    return value === null ? 0 : Number(value);
  }
}

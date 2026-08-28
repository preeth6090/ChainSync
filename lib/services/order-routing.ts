import { Prisma, FulfillmentType, OrderItemStatus, OrderStatus, PurchaseOrderStatus, MoqConflictStatus, ReservationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/services/tx-utils';
import { selectCheapestVendor } from '@/lib/services/vendor-selection';
import { getApprovalThreshold } from '@/lib/services/procurement';
import { generatePoNumber } from '@/lib/services/numbering';
import { notifyInternalTeam, notifyCustomer } from '@/lib/services/notifications';

const MOQ_CONFLICT_ESCALATION_HOURS = 4;

export interface RoutingSummary {
  warehouseFulfilled: { orderItemId: string; quantity: number }[];
  vendorRouted: { orderItemId: string; vendorId: string; quantity: number }[];
  moqConflicts: { orderItemId: string; vendorCatalogId: string }[];
  shortages: { orderItemId: string; shortBy: number }[];
  draftPurchaseOrderIds: string[];
}

interface VendorBucketLine {
  orderItemId: string;
  productId: string;
  vendorCatalogId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
}

// Orchestrates split fulfillment for a CONFIRMED order:
//  - WAREHOUSE_ONLY: fills from local stock; if short, halts that line for internal review
//    rather than silently under-shipping (this SKU is not allowed to drop-ship).
//  - DROP_SHIP_ONLY: the full quantity is routed to the cheapest eligible vendor.
//  - HYBRID: fills what it can from the warehouse, routes the remainder to procurement.
// Vendor-routed lines are grouped per vendor into one draft PurchaseOrder per vendor per
// order, flagged for maker-checker approval based on the configured threshold.
export async function routeOrderFulfillment(orderId: string): Promise<RoutingSummary> {
  return runSerializable(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true, stockReservation: true } } },
    });

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Order ${order.orderNumber} must be CONFIRMED before routing (current: ${order.status}).`);
    }

    const summary: RoutingSummary = {
      warehouseFulfilled: [],
      vendorRouted: [],
      moqConflicts: [],
      shortages: [],
      draftPurchaseOrderIds: [],
    };
    const vendorBuckets = new Map<string, VendorBucketLine[]>();

    // Tracks stock still available per product as this loop allocates it. Reading
    // item.product.warehouseStock directly would be wrong whenever an order has two line
    // items for the same product: both would see the same pre-loop snapshot and could
    // together allocate more than actually exists.
    const availableStock = new Map<string, number>();
    for (const item of order.items) {
      if (!availableStock.has(item.productId)) {
        availableStock.set(item.productId, item.product.warehouseStock);
      }
    }

    for (const item of order.items) {
      if (item.status !== OrderItemStatus.PENDING && item.status !== OrderItemStatus.RESERVED) continue;

      let warehouseQty = 0;
      let vendorQty = item.quantity;

      if (item.fulfillmentType === FulfillmentType.WAREHOUSE_ONLY || item.fulfillmentType === FulfillmentType.HYBRID) {
        const remaining = availableStock.get(item.productId)!;
        warehouseQty = Math.min(remaining, item.quantity);
        vendorQty = item.quantity - warehouseQty;
        availableStock.set(item.productId, remaining - warehouseQty);

        if (item.fulfillmentType === FulfillmentType.WAREHOUSE_ONLY && vendorQty > 0) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { status: OrderItemStatus.AWAITING_INTERNAL_REVIEW },
          });
          await notifyInternalTeam(
            tx,
            'Warehouse stock shortage',
            `${item.product.sku} is WAREHOUSE_ONLY but short by ${vendorQty} on order ${order.orderNumber}.`,
            'OrderItem',
            item.id
          );
          summary.shortages.push({ orderItemId: item.id, shortBy: vendorQty });
          continue;
        }

        if (warehouseQty > 0) {
          await tx.product.update({ where: { id: item.productId }, data: { warehouseStock: { decrement: warehouseQty } } });
          if (item.stockReservation) {
            await tx.stockReservation.update({
              where: { id: item.stockReservation.id },
              data: { status: ReservationStatus.CONSUMED },
            });
          }
          summary.warehouseFulfilled.push({ orderItemId: item.id, quantity: warehouseQty });
        }
      }

      if (vendorQty > 0) {
        const selection = await selectCheapestVendor(item.productId, vendorQty, tx);

        if (!selection.moqSatisfied) {
          await tx.orderItem.update({ where: { id: item.id }, data: { status: OrderItemStatus.MOQ_CONFLICT } });
          const alert = await tx.moqConflictAlert.create({
            data: {
              orderItemId: item.id,
              vendorCatalogId: selection.cheapestOverall.id,
              customerQty: vendorQty,
              vendorMoq: selection.cheapestOverall.vendorMoq,
            },
          });
          await notifyInternalTeam(
            tx,
            'MOQ conflict — routing halted',
            `Order ${order.orderNumber}: ${item.product.sku} needs ${vendorQty}, cheapest vendor's MOQ is ${selection.cheapestOverall.vendorMoq}.`,
            'MoqConflictAlert',
            alert.id
          );
          summary.moqConflicts.push({ orderItemId: item.id, vendorCatalogId: selection.cheapestOverall.id });
          continue;
        }

        const bucket = vendorBuckets.get(selection.vendorCatalog.vendorId) ?? [];
        bucket.push({
          orderItemId: item.id,
          productId: item.productId,
          vendorCatalogId: selection.vendorCatalog.id,
          quantity: vendorQty,
          unitPrice: selection.vendorCatalog.price,
        });
        vendorBuckets.set(selection.vendorCatalog.vendorId, bucket);
        summary.vendorRouted.push({ orderItemId: item.id, vendorId: selection.vendorCatalog.vendorId, quantity: vendorQty });
      }

      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: vendorQty > 0 ? OrderItemStatus.ROUTED_VENDOR : OrderItemStatus.ROUTED_WAREHOUSE },
      });
    }

    const threshold = await getApprovalThreshold(tx, order.companyId);
    for (const [vendorId, lines] of vendorBuckets) {
      const totalAmount = lines.reduce((sum, l) => sum.plus(l.unitPrice.mul(l.quantity)), new Prisma.Decimal(0));
      const po = await tx.purchaseOrder.create({
        data: {
          companyId: order.companyId,
          poNumber: await generatePoNumber(tx, order.companyId),
          vendorId,
          status: PurchaseOrderStatus.DRAFT,
          totalAmount,
          requiresApproval: totalAmount.gte(threshold),
          items: {
            create: lines.map((l) => ({
              vendorCatalogId: l.vendorCatalogId,
              orderItemId: l.orderItemId,
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              lineTotal: l.unitPrice.mul(l.quantity),
            })),
          },
        },
      });
      summary.draftPurchaseOrderIds.push(po.id);
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status:
          summary.moqConflicts.length > 0 || summary.shortages.length > 0 || summary.vendorRouted.length > 0
            ? OrderStatus.AWAITING_PROCUREMENT
            : OrderStatus.PROCESSING,
      },
    });

    return summary;
  });
}

export type MoqConflictResolution = 'FORCE_ROUTE' | 'CANCEL';

// Internal team resolves an open MOQ conflict before the auto-cancel sweep gets to it:
// either cancel the line immediately (same effect as the timeout, just sooner), or force it
// through to that vendor despite the MOQ mismatch — used when the team secured a one-off
// exception directly with the vendor. FORCE_ROUTE always creates a dedicated draft PO for
// just this line rather than trying to merge into whatever routing already created for the
// same vendor/order, since that PO may already be submitted for approval by this point.
export async function resolveMoqConflictManually(
  alertId: string,
  resolverUserId: string,
  resolution: MoqConflictResolution
) {
  return prisma.$transaction(async (tx) => {
    const alert = await tx.moqConflictAlert.findUniqueOrThrow({
      where: { id: alertId },
      include: {
        orderItem: { include: { order: { include: { customer: true } }, product: true } },
        vendorCatalog: true,
      },
    });
    if (alert.status !== MoqConflictStatus.OPEN) {
      throw new Error(`MOQ conflict ${alertId} is already resolved.`);
    }

    await tx.moqConflictAlert.update({
      where: { id: alertId },
      data: { status: MoqConflictStatus.RESOLVED_MANUAL_OVERRIDE, resolvedByUserId: resolverUserId, resolvedAt: new Date() },
    });

    if (resolution === 'CANCEL') {
      await tx.orderItem.update({ where: { id: alert.orderItemId }, data: { status: OrderItemStatus.CANCELLED } });
      await notifyCustomer(
        tx,
        alert.orderItem.order.customer.userId,
        'Item cancelled from your order',
        `We couldn't source the quantity you ordered for ${alert.orderItem.product.sku} on order ${alert.orderItem.order.orderNumber}. That line has been cancelled and will not be charged.`,
        'OrderItem',
        alert.orderItemId
      );
      return { orderItemId: alert.orderItemId, poId: null as string | null };
    }

    const lineTotal = alert.vendorCatalog.price.mul(alert.customerQty);
    const threshold = await getApprovalThreshold(tx, alert.orderItem.order.companyId);
    const po = await tx.purchaseOrder.create({
      data: {
        companyId: alert.orderItem.order.companyId,
        poNumber: await generatePoNumber(tx, alert.orderItem.order.companyId),
        vendorId: alert.vendorCatalog.vendorId,
        status: PurchaseOrderStatus.DRAFT,
        totalAmount: lineTotal,
        requiresApproval: lineTotal.gte(threshold),
        items: {
          create: [
            {
              vendorCatalogId: alert.vendorCatalogId,
              orderItemId: alert.orderItemId,
              productId: alert.orderItem.productId,
              quantity: alert.customerQty,
              unitPrice: alert.vendorCatalog.price,
              lineTotal,
            },
          ],
        },
      },
    });

    await tx.orderItem.update({ where: { id: alert.orderItemId }, data: { status: OrderItemStatus.ROUTED_VENDOR } });

    return { orderItemId: alert.orderItemId, poId: po.id as string | null };
  });
}

// Scheduled sweep: MOQ conflicts the internal team hasn't resolved within the escalation
// window are auto-cancelled — "if unresolvable, automatically cancels/rejects the
// customer's line item with an automated status notification."
export async function autoCancelStaleMoqConflicts(): Promise<number> {
  const cutoff = new Date(Date.now() - MOQ_CONFLICT_ESCALATION_HOURS * 60 * 60 * 1000);
  const stale = await prisma.moqConflictAlert.findMany({
    where: { status: MoqConflictStatus.OPEN, createdAt: { lte: cutoff } },
    include: { orderItem: { include: { order: { include: { customer: true } }, product: true } } },
  });

  const stillPendingStatuses: OrderItemStatus[] = [
    OrderItemStatus.PENDING,
    OrderItemStatus.RESERVED,
    OrderItemStatus.MOQ_CONFLICT,
    OrderItemStatus.AWAITING_INTERNAL_REVIEW,
  ];

  for (const alert of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.moqConflictAlert.update({
        where: { id: alert.id },
        data: { status: MoqConflictStatus.AUTO_CANCELLED, resolvedAt: new Date() },
      });
      await tx.orderItem.update({ where: { id: alert.orderItemId }, data: { status: OrderItemStatus.CANCELLED } });
      await notifyCustomer(
        tx,
        alert.orderItem.order.customer.userId,
        'Item cancelled from your order',
        `We couldn't source the quantity you ordered for ${alert.orderItem.product.sku} on order ${alert.orderItem.order.orderNumber}. That line has been cancelled and will not be charged.`,
        'OrderItem',
        alert.orderItemId
      );

      // Cancelling this line may have been the only thing keeping the order in
      // AWAITING_PROCUREMENT — without this it would stay stuck there indefinitely even
      // once every other line is already fulfilled.
      const stillPending = await tx.orderItem.count({
        where: { orderId: alert.orderItem.orderId, status: { in: stillPendingStatuses } },
      });
      if (stillPending === 0) {
        // updateMany (not update): if the order isn't AWAITING_PROCUREMENT this is a no-op,
        // whereas update's compound where would throw P2025 and abort the whole transaction.
        await tx.order.updateMany({
          where: { id: alert.orderItem.orderId, status: OrderStatus.AWAITING_PROCUREMENT },
          data: { status: OrderStatus.PROCESSING },
        });
      }
    });
  }

  return stale.length;
}

import { ShipmentStatus, DisputeStatus, OrderStatus, DisputeReason } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateInvoiceForOrder, generateCreditNote } from '@/lib/services/billing';
import { notifyInternalTeam } from '@/lib/services/notifications';

const DISPUTE_WINDOW_HOURS = 24;

// Driver/vendor/warehouse confirms physical delivery — starts the 24-hour dispute window.
// In production this is the target of a delivery webhook or driver-app action; exposed here
// as a plain service call since no such integration exists yet.
export async function markShipmentDelivered(shipmentId: string) {
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: ShipmentStatus.DISPUTE_WINDOW_OPEN,
      deliveredAt: new Date(),
      disputeWindowEndsAt: new Date(Date.now() + DISPUTE_WINDOW_HOURS * 60 * 60 * 1000),
    },
  });
}

export interface DisputeItemInput {
  orderItemId: string;
  reason: DisputeReason;
  quantity: number;
  notes?: string;
  photoUrls?: string[];
}

// Customer reports damaged/missing items within the window. Blocks that order's invoice
// generation until resolved — closeDisputeWindows skips any shipment with an open dispute.
export async function raiseDispute(
  orderId: string,
  shipmentId: string,
  raisedByUserId: string,
  description: string,
  items: DisputeItemInput[]
) {
  if (items.length === 0) throw new Error('A dispute needs at least one affected item.');

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
    if (shipment.orderId !== orderId) throw new Error('That shipment does not belong to this order.');
    if (shipment.status !== ShipmentStatus.DISPUTE_WINDOW_OPEN) {
      throw new Error(`Shipment ${shipment.shipmentNumber} is not in its dispute window (status: ${shipment.status}).`);
    }
    if (shipment.disputeWindowEndsAt && shipment.disputeWindowEndsAt < new Date()) {
      throw new Error('The 24-hour dispute window for this shipment has already closed.');
    }

    const dispute = await tx.dispute.create({
      data: {
        orderId,
        shipmentId,
        raisedByUserId,
        description,
        items: { create: items.map((i) => ({ ...i, photoUrls: i.photoUrls ?? [] })) },
      },
    });

    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.DISPUTED } });
    await notifyInternalTeam(
      tx,
      'Dispute raised',
      `A dispute was raised on order ${orderId}, shipment ${shipment.shipmentNumber}: ${description}`,
      'Dispute',
      dispute.id
    );

    return dispute;
  });
}

export type DisputeResolution = 'REFUND' | 'REPLACEMENT' | 'REJECTED';

const RESOLUTION_STATUS: Record<DisputeResolution, DisputeStatus> = {
  REFUND: DisputeStatus.RESOLVED_REFUND,
  REPLACEMENT: DisputeStatus.RESOLVED_REPLACEMENT,
  REJECTED: DisputeStatus.RESOLVED_REJECTED,
};

// Support/admin resolves the dispute. A refund either keeps the disputed lines off the
// invoice (generateInvoiceForOrder hasn't run for this order yet) or issues a credit note
// against the invoice that already exists.
export async function resolveDispute(disputeId: string, resolution: DisputeResolution, resolutionNote?: string) {
  const dispute = await prisma.$transaction(async (tx) => {
    const existing = await tx.dispute.findUniqueOrThrow({ where: { id: disputeId } });
    if (existing.status !== DisputeStatus.OPEN && existing.status !== DisputeStatus.INVESTIGATING) {
      throw new Error(`Dispute ${disputeId} is already resolved.`);
    }

    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: { status: RESOLUTION_STATUS[resolution], resolvedAt: new Date(), resolutionNote },
    });

    // The order may still have other open disputes (multiple shipments); only clear
    // DISPUTED once none remain.
    const stillOpen = await tx.dispute.count({
      where: { orderId: updated.orderId, status: { in: [DisputeStatus.OPEN, DisputeStatus.INVESTIGATING] } },
    });
    if (stillOpen === 0) {
      await tx.order.updateMany({
        where: { id: updated.orderId, status: OrderStatus.DISPUTED },
        data: { status: OrderStatus.DISPUTE_WINDOW },
      });
    }

    return updated;
  });

  if (resolution === 'REFUND') {
    const existingInvoice = await prisma.invoice.findFirst({
      where: { orderId: dispute.orderId, type: 'TAX_INVOICE' },
    });
    if (existingInvoice) {
      await generateCreditNote(dispute.id);
    }
    // If no invoice exists yet, the next closeDisputeWindows/generateInvoiceForOrder run
    // will naturally exclude this dispute's items — no credit note needed for that case.
  }

  return dispute;
}

// Scheduled sweep (run every few minutes): finalizes shipments whose 24h window has lapsed
// undisputed, then generates the order's tax invoice once every shipment on that order is
// finalized and no dispute remains open — "moves to final billing."
export async function closeDisputeWindows(): Promise<{ finalizedShipments: number; invoicedOrders: number }> {
  const dueShipments = await prisma.shipment.findMany({
    where: { status: ShipmentStatus.DISPUTE_WINDOW_OPEN, disputeWindowEndsAt: { lte: new Date() } },
  });

  const touchedOrderIds = new Set<string>();
  let finalizedShipments = 0;

  for (const shipment of dueShipments) {
    const openDispute = await prisma.dispute.findFirst({
      where: { shipmentId: shipment.id, status: { in: [DisputeStatus.OPEN, DisputeStatus.INVESTIGATING] } },
    });
    if (openDispute) continue; // stays DISPUTE_WINDOW_OPEN until resolved

    await prisma.shipment.update({ where: { id: shipment.id }, data: { status: ShipmentStatus.FINALIZED } });
    finalizedShipments++;
    touchedOrderIds.add(shipment.orderId);
  }

  let invoicedOrders = 0;
  for (const orderId of touchedOrderIds) {
    const [pendingShipments, openDisputes, alreadyInvoiced] = await Promise.all([
      prisma.shipment.count({
        where: { orderId, status: { notIn: [ShipmentStatus.FINALIZED, ShipmentStatus.RETURNED] } },
      }),
      prisma.dispute.count({ where: { orderId, status: { in: [DisputeStatus.OPEN, DisputeStatus.INVESTIGATING] } } }),
      prisma.invoice.findFirst({ where: { orderId, type: 'TAX_INVOICE' } }),
    ]);
    if (pendingShipments === 0 && openDisputes === 0 && !alreadyInvoiced) {
      await generateInvoiceForOrder(orderId);
      invoicedOrders++;
    }
  }

  return { finalizedShipments, invoicedOrders };
}

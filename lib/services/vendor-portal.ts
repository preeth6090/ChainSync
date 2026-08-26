import { Prisma, PurchaseOrderStatus, DispatchType, ShipmentStatus, DispatchProofType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { notifyInternalTeam } from '@/lib/services/notifications';
import { generateShipmentNumber } from '@/lib/services/numbering';

export class InvalidMagicLinkError extends Error {}

const RESPONDABLE_STATUSES: PurchaseOrderStatus[] = [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.SENT_TO_VENDOR];
const DISPATCHABLE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.ACCEPTED_BY_VENDOR,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

// Resolves a vendor portal magic link to its vendor + PO context. Does not block reuse —
// a vendor may reopen the same SMS/WhatsApp link any number of times until it expires,
// since the portal is a whole session (accept, then dispatch later), not a one-shot action.
export async function resolveVendorMagicLink(token: string) {
  const link = await prisma.vendorMagicLink.findUnique({
    where: { token },
    include: { vendorUser: { include: { vendor: true } } },
  });

  if (!link || link.expiresAt < new Date()) {
    throw new InvalidMagicLinkError('This link has expired. Ask the buyer to resend it.');
  }
  if (!link.consumedAt) {
    await prisma.vendorMagicLink.update({ where: { id: link.id }, data: { consumedAt: new Date() } });
  }

  return { vendor: link.vendorUser.vendor, purchaseOrderId: link.purchaseOrderId };
}

export async function getPurchaseOrderForVendor(purchaseOrderId: string, vendorId: string) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: {
      items: { include: { product: true } },
      shipments: { include: { items: true, proofs: true }, orderBy: { createdAt: 'asc' } },
      priceProposals: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (po.vendorId !== vendorId) {
    throw new InvalidMagicLinkError('This purchase order does not belong to this vendor.');
  }
  return po;
}

async function assertVendorOwnsPo(tx: Prisma.TransactionClient, poId: string, vendorId: string) {
  const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
  if (po.vendorId !== vendorId) throw new InvalidMagicLinkError('This purchase order does not belong to this vendor.');
  return po;
}

export async function acceptPurchaseOrder(poId: string, vendorId: string) {
  return prisma.$transaction(async (tx) => {
    const po = await assertVendorOwnsPo(tx, poId, vendorId);
    if (!RESPONDABLE_STATUSES.includes(po.status)) {
      throw new Error(`PO ${po.poNumber} is not awaiting a vendor response (current: ${po.status}).`);
    }
    return tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: PurchaseOrderStatus.ACCEPTED_BY_VENDOR, vendorRespondedAt: new Date() },
    });
  });
}

// Vendor's counter-offer from the "Propose New Price / Reject" drawer. Never mutates the
// PO's totalAmount directly — the maker-checker desk reviews the proposal and re-approves.
export async function proposeNewPrice(poId: string, vendorId: string, proposedAmount: Prisma.Decimal, reason: string) {
  return prisma.$transaction(async (tx) => {
    const po = await assertVendorOwnsPo(tx, poId, vendorId);
    if (!RESPONDABLE_STATUSES.includes(po.status)) {
      throw new Error(`PO ${po.poNumber} is not awaiting a vendor response (current: ${po.status}).`);
    }

    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: PurchaseOrderStatus.PRICE_PROPOSED } });
    const proposal = await tx.priceProposal.create({ data: { purchaseOrderId: poId, proposedAmount, reason } });

    await notifyInternalTeam(
      tx,
      'Vendor proposed a new price',
      `${po.poNumber}: vendor proposed Rs.${proposedAmount.toFixed(2)} (was Rs.${po.totalAmount.toFixed(2)}). Reason: ${reason || 'none given'}.`,
      'PriceProposal',
      proposal.id
    );
    return proposal;
  });
}

export async function rejectPurchaseOrderByVendor(poId: string, vendorId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const po = await assertVendorOwnsPo(tx, poId, vendorId);
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: PurchaseOrderStatus.VENDOR_REJECTED, vendorRespondedAt: new Date(), rejectionReason: reason },
    });
    await notifyInternalTeam(
      tx,
      'Vendor rejected a purchase order',
      `${po.poNumber} was rejected by the vendor. Reason: ${reason || 'none given'}.`,
      'PurchaseOrder',
      poId
    );
  });
}

export interface DispatchItemInput {
  purchaseOrderItemId: string;
  quantity: number;
}

export interface CreateShipmentInput {
  dispatchType: DispatchType;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  trackingLink?: string;
  items: DispatchItemInput[];
}

// Creates one shipment. A PO can be split into several of these ("child shipments"), each
// with its own dispatch type and tracking link — e.g. two separate Porter trucks for one PO.
export async function createShipment(poId: string, vendorId: string, input: CreateShipmentInput) {
  return prisma.$transaction(async (tx) => {
    const po = await assertVendorOwnsPo(tx, poId, vendorId);
    if (!DISPATCHABLE_STATUSES.includes(po.status)) {
      throw new Error(`PO ${po.poNumber} must be accepted before it can be dispatched (current: ${po.status}).`);
    }
    if (input.items.length === 0) throw new Error('A shipment needs at least one line item.');

    const poItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
    const poItemMap = new Map(poItems.map((i) => [i.id, i]));

    const existingShipmentItems = await tx.shipmentItem.findMany({
      where: { purchaseOrderItemId: { in: poItems.map((i) => i.id) } },
    });
    const shippedSoFar = new Map<string, number>();
    for (const si of existingShipmentItems) {
      if (!si.purchaseOrderItemId) continue;
      shippedSoFar.set(si.purchaseOrderItemId, (shippedSoFar.get(si.purchaseOrderItemId) ?? 0) + si.quantity);
    }

    let orderId: string | null = null;
    for (const line of input.items) {
      const poItem = poItemMap.get(line.purchaseOrderItemId);
      if (!poItem || !poItem.orderItemId) {
        throw new Error(`Line ${line.purchaseOrderItemId} is not a valid, order-linked item on PO ${po.poNumber}.`);
      }
      const alreadyShipped = shippedSoFar.get(line.purchaseOrderItemId) ?? 0;
      if (alreadyShipped + line.quantity > poItem.quantity) {
        throw new Error(`Shipping ${line.quantity} would exceed the ${poItem.quantity} ordered for that line.`);
      }
      if (!orderId) {
        orderId = (await tx.orderItem.findUniqueOrThrow({ where: { id: poItem.orderItemId } })).orderId;
      }
    }

    const shipment = await tx.shipment.create({
      data: {
        shipmentNumber: await generateShipmentNumber(tx),
        orderId: orderId!,
        purchaseOrderId: poId,
        dispatchType: input.dispatchType,
        status: ShipmentStatus.DISPATCHED,
        vehicleNumber: input.vehicleNumber,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        trackingLink: input.trackingLink,
        dispatchedAt: new Date(),
        items: {
          create: input.items.map((line) => ({
            purchaseOrderItemId: line.purchaseOrderItemId,
            orderItemId: poItemMap.get(line.purchaseOrderItemId)!.orderItemId!,
            quantity: line.quantity,
          })),
        },
      },
    });

    const totalOrdered = poItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalShippedNow =
      [...shippedSoFar.values()].reduce((sum, qty) => sum + qty, 0) +
      input.items.reduce((sum, l) => sum + l.quantity, 0);
    if (totalShippedNow >= totalOrdered) {
      await tx.purchaseOrder.update({ where: { id: poId }, data: { status: PurchaseOrderStatus.DISPATCHED } });
    }

    return shipment;
  });
}

export async function addDispatchProof(shipmentId: string, vendorId: string, type: DispatchProofType, fileUrl: string) {
  const shipment = await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId }, include: { purchaseOrder: true } });
  if (shipment.purchaseOrder?.vendorId !== vendorId) {
    throw new InvalidMagicLinkError('This shipment does not belong to this vendor.');
  }
  return prisma.dispatchProof.create({ data: { shipmentId, type, fileUrl } });
}

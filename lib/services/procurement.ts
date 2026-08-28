import { Prisma, PurchaseOrderStatus, ThreeWayMatchStatus, PayableStatus, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export class SegregationOfDutiesError extends Error {}
export class UnauthorizedApproverError extends Error {}

export async function getApprovalThreshold(
  tx: Prisma.TransactionClient | typeof prisma,
  companyId: string
): Promise<Prisma.Decimal> {
  const config = await tx.approvalConfig.findFirst({ where: { companyId, isActive: true }, orderBy: { updatedAt: 'desc' } });
  return config?.autoApproveBelow ?? new Prisma.Decimal(50000);
}

// Maker submits a DRAFT PO. Below the configured threshold it auto-approves and skips the
// checker entirely — "auto-approve POs below ₹50,000"; above it, the PO waits for a
// PROCUREMENT_CHECKER / ADMIN to sign off.
export async function submitPurchaseOrderForApproval(poId: string, makerUserId: string) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } });
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new Error(`PO ${po.poNumber} is not in DRAFT (current: ${po.status}).`);
    }

    const autoApprove = !po.requiresApproval;
    return tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        makerId: makerUserId,
        status: autoApprove ? PurchaseOrderStatus.APPROVED : PurchaseOrderStatus.PENDING_APPROVAL,
        approvedAt: autoApprove ? new Date() : null,
      },
    });
  });
}

// Enforces maker-checker segregation of duties: whoever drafted the PO cannot also approve it.
export async function approvePurchaseOrder(poId: string, checkerUserId: string) {
  return prisma.$transaction(async (tx) => {
    const [po, checker] = await Promise.all([
      tx.purchaseOrder.findUniqueOrThrow({ where: { id: poId } }),
      tx.user.findUniqueOrThrow({ where: { id: checkerUserId } }),
    ]);

    if (checker.role !== UserRole.ADMIN && checker.role !== UserRole.PROCUREMENT_CHECKER) {
      throw new UnauthorizedApproverError(`User ${checkerUserId} is not authorized to approve purchase orders.`);
    }
    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      throw new Error(`PO ${po.poNumber} is not PENDING_APPROVAL (current: ${po.status}).`);
    }
    if (po.makerId === checkerUserId) {
      throw new SegregationOfDutiesError('The PO maker cannot also approve their own PO.');
    }

    return tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: PurchaseOrderStatus.APPROVED, checkerId: checkerUserId, approvedAt: new Date() },
    });
  });
}

export async function rejectPurchaseOrder(poId: string, checkerUserId: string, reason: string) {
  return prisma.purchaseOrder.update({
    where: { id: poId },
    data: {
      status: PurchaseOrderStatus.REJECTED,
      checkerId: checkerUserId,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });
}

// Warehouse logs what physically arrived against a dispatched PO line. Additive (not a
// flat set) so multiple partial deliveries against one line accumulate correctly, and the
// parent PO's status reflects whether every line is now fully received.
export async function recordGoodsReceipt(purchaseOrderItemId: string, quantityReceived: number) {
  if (quantityReceived <= 0) throw new Error('quantityReceived must be positive.');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.purchaseOrderItem.findUniqueOrThrow({ where: { id: purchaseOrderItemId } });
    const newReceived = existing.receivedQuantity + quantityReceived;
    if (newReceived > existing.quantity) {
      throw new Error(`Received quantity (${newReceived}) would exceed the ${existing.quantity} ordered for this line.`);
    }

    const item = await tx.purchaseOrderItem.update({
      where: { id: purchaseOrderItemId },
      data: { receivedQuantity: newReceived },
    });

    const siblings = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: item.purchaseOrderId } });
    const fullyReceived = siblings.every((i) => i.receivedQuantity >= i.quantity);

    // updateMany (not update): if the PO isn't in a dispatched/partially-received state this
    // is a harmless no-op, whereas update's compound where would throw P2025 instead.
    await tx.purchaseOrder.updateMany({
      where: {
        id: item.purchaseOrderId,
        status: { in: [PurchaseOrderStatus.DISPATCHED, PurchaseOrderStatus.PARTIALLY_RECEIVED] },
      },
      data: { status: fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });

    return item;
  });
}

export interface VendorBillLineInput {
  purchaseOrderItemId: string;
  invoicedQuantity: number;
  invoicedPrice: Prisma.Decimal | number;
}

// Logs the vendor's invoice against a PO before 3-way matching can run against it. poPrice
// and receivedQuantity are snapshotted from each PurchaseOrderItem at this moment, so a
// match always compares against what was actually received, not a value that could keep
// changing after the fact.
export async function recordVendorBill(
  purchaseOrderId: string,
  billNumber: string,
  billAmount: Prisma.Decimal | number,
  lines: VendorBillLineInput[],
  fileUrl?: string
) {
  if (lines.length === 0) throw new Error('A vendor bill needs at least one line item.');

  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } });
    const poItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
    const poItemMap = new Map(poItems.map((i) => [i.id, i]));

    const items = lines.map((line) => {
      const poItem = poItemMap.get(line.purchaseOrderItemId);
      if (!poItem) throw new Error(`Line ${line.purchaseOrderItemId} is not part of PO ${po.poNumber}.`);
      return {
        purchaseOrderItemId: line.purchaseOrderItemId,
        invoicedQuantity: line.invoicedQuantity,
        invoicedPrice: line.invoicedPrice,
        poPrice: poItem.unitPrice,
        receivedQuantity: poItem.receivedQuantity,
      };
    });

    return tx.vendorBill.create({
      data: { billNumber, vendorId: po.vendorId, purchaseOrderId, billAmount, fileUrl, items: { create: items } },
      include: { items: true },
    });
  });
}

const PRICE_TOLERANCE = new Prisma.Decimal('0.01');

// 3-way match: PO price vs invoiced price vs received quantity, line by line. Any mismatch
// blocks payment settlement (no VendorPayable is created) and flags the bill for manual
// finance review instead of silently paying out.
export async function performThreeWayMatch(vendorBillId: string) {
  return prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.findUniqueOrThrow({
      where: { id: vendorBillId },
      include: { items: true },
    });

    const mismatches: string[] = [];

    for (const line of bill.items) {
      const priceMatches = line.invoicedPrice.minus(line.poPrice).abs().lte(PRICE_TOLERANCE);
      const qtyMatches = line.invoicedQuantity === line.receivedQuantity;
      const isMatched = priceMatches && qtyMatches;

      if (!priceMatches) {
        mismatches.push(`Line ${line.id}: invoiced price Rs.${line.invoicedPrice} vs PO price Rs.${line.poPrice}.`);
      }
      if (!qtyMatches) {
        mismatches.push(`Line ${line.id}: invoiced qty ${line.invoicedQuantity} vs received qty ${line.receivedQuantity}.`);
      }

      await tx.vendorBillItem.update({ where: { id: line.id }, data: { isMatched } });
    }

    const allMatched = mismatches.length === 0;
    const updatedBill = await tx.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        matchStatus: allMatched ? ThreeWayMatchStatus.MATCHED : ThreeWayMatchStatus.MISMATCHED,
        mismatchNotes: allMatched ? null : mismatches.join(' '),
      },
    });

    if (allMatched) {
      await tx.vendorPayable.create({
        data: { vendorId: bill.vendorId, vendorBillId: bill.id, amount: bill.billAmount, status: PayableStatus.PENDING },
      });
    }

    return updatedBill;
  });
}

// Finance releases a matched payable, closing the loop on the vendor's balance.
export async function releaseVendorPayable(payableId: string) {
  return prisma.vendorPayable.update({
    where: { id: payableId },
    data: { status: PayableStatus.PAID, releasedAt: new Date() },
  });
}

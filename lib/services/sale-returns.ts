import { DisputeStatus, DisputeReason, InvoiceType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateCreditNote } from '@/lib/services/billing';

// A staff-initiated return (walk-in refund, damaged-on-arrival caught at a later audit, etc.)
// rather than the customer-raised Dispute flow — created and resolved as RESOLVED_REFUND in
// the same step, then immediately credited via the same generateCreditNote path a real
// dispute resolution uses. Only whole order lines can be returned, not partial quantities:
// generateCreditNote credits an entire InvoiceItem's amount for any orderItemId it's given,
// so a partial-quantity return would silently over-credit if offered here.
export async function createSaleReturn(
  raisedByUserId: string,
  orderId: string,
  orderItemIds: string[],
  reason: DisputeReason,
  notes?: string
) {
  if (orderItemIds.length === 0) throw new Error('Select at least one line item to return.');

  const invoice = await prisma.invoice.findFirst({ where: { orderId, type: InvoiceType.TAX_INVOICE } });
  if (!invoice) throw new Error('This order has no tax invoice yet — nothing to credit.');

  const orderItems = await prisma.orderItem.findMany({
    where: { id: { in: orderItemIds }, orderId },
    select: { id: true, quantity: true },
  });
  if (orderItems.length !== orderItemIds.length) {
    throw new Error('One or more selected line items do not belong to this order.');
  }

  const dispute = await prisma.dispute.create({
    data: {
      orderId,
      raisedByUserId,
      status: DisputeStatus.RESOLVED_REFUND,
      description: notes?.trim() || 'Staff-initiated sale return.',
      resolvedAt: new Date(),
      resolutionNote: 'Sale return processed directly by staff.',
      items: {
        create: orderItems.map((oi) => ({ orderItemId: oi.id, reason, quantity: oi.quantity, photoUrls: [] })),
      },
    },
  });

  return generateCreditNote(dispute.id, raisedByUserId);
}

export async function listReturnableOrderItems(orderId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { orderId, type: InvoiceType.TAX_INVOICE },
    include: { items: true },
  });
  if (!invoice) return [];

  const alreadyCredited = new Set(
    (
      await prisma.disputeItem.findMany({
        where: { dispute: { orderId, status: DisputeStatus.RESOLVED_REFUND } },
        select: { orderItemId: true },
      })
    ).map((d) => d.orderItemId)
  );

  return invoice.items
    .filter((item) => item.orderItemId && !alreadyCredited.has(item.orderItemId))
    .map((item) => ({
      orderItemId: item.orderItemId as string,
      productName: item.productName,
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
    }));
}

export async function listCreditNotes() {
  return prisma.invoice.findMany({
    where: { type: InvoiceType.CREDIT_NOTE },
    include: {
      customer: { include: { user: true } },
      order: { select: { orderNumber: true } },
      originalInvoice: { select: { invoiceNumber: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });
}

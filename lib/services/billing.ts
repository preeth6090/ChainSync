import { Prisma, InvoiceType, OrderStatus, DisputeStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { runSerializable } from '@/lib/services/tx-utils';
import { calculateLineGst, summarizeInvoiceTotals, determineSupplyType } from '@/lib/services/gst';
import { nextInvoiceNumber } from '@/lib/services/numbering';

// Generates the order's tax invoice — the "moves to final billing" step once every
// shipment's 24-hour dispute window has closed undisputed. Idempotent per order (refuses to
// run twice), and SERIALIZABLE so two concurrent triggers (e.g. an overlapping cron run and
// a manual override) can't both pass the "no invoice yet" check and double-invoice the order.
//
// Items whose dispute already resolved as a refund are simply left off the invoice rather
// than invoiced-then-credited — see generateCreditNote for the case where the invoice
// already existed by the time a dispute resolved.
export async function generateInvoiceForOrder(orderId: string) {
  return runSerializable(async (tx) => {
    const existing = await tx.invoice.findFirst({ where: { orderId, type: InvoiceType.TAX_INVOICE } });
    if (existing) throw new Error(`Order already has tax invoice ${existing.invoiceNumber}.`);

    const [order, company] = await Promise.all([
      tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          customer: { include: { user: true } },
          shippingAddress: true,
        },
      }),
      tx.companyProfile.findFirstOrThrow(),
    ]);

    const refundedOrderItemIds = new Set(
      (
        await tx.disputeItem.findMany({
          where: { dispute: { orderId, status: DisputeStatus.RESOLVED_REFUND } },
          select: { orderItemId: true },
        })
      ).map((d) => d.orderItemId)
    );

    const billableItems = order.items.filter(
      (item) => item.status !== 'CANCELLED' && !refundedOrderItemIds.has(item.id)
    );
    if (billableItems.length === 0) {
      throw new Error(`Order ${order.orderNumber} has nothing billable — every line was cancelled or refunded.`);
    }

    const supplyType = determineSupplyType(company.stateCode, order.placeOfSupplyStateCode);
    const lines = billableItems.map((item) => ({
      item,
      gst: calculateLineGst({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        gstRate: item.gstRate,
        companyStateCode: company.stateCode,
        placeOfSupplyStateCode: order.placeOfSupplyStateCode,
      }),
    }));
    const totals = summarizeInvoiceTotals(lines.map((l) => l.gst));

    const customerName =
      order.customer.legalName ?? order.customer.user.name ?? order.customer.user.email ?? 'Customer';

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        type: InvoiceType.TAX_INVOICE,
        orderId: order.id,
        customerId: order.customerId,
        supplyType,
        placeOfSupplyStateCode: order.placeOfSupplyStateCode,
        companyStateCode: company.stateCode,
        customerGstin: order.customer.gstin,
        customerLegalName: customerName,
        billingAddressSnapshot: {
          line1: order.shippingAddress.line1,
          line2: order.shippingAddress.line2,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          pincode: order.shippingAddress.pincode,
        },
        subtotal: totals.subtotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        grandTotal: totals.grandTotal,
        items: {
          create: lines.map(({ item, gst }) => ({
            orderItemId: item.id,
            productId: item.productId,
            productName: item.product.name,
            hsnCode: item.product.hsnCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            gstRate: item.gstRate,
            taxableValue: gst.taxableValue,
            cgstAmount: gst.cgstAmount,
            sgstAmount: gst.sgstAmount,
            igstAmount: gst.igstAmount,
            lineTotal: gst.lineTotal,
          })),
        },
      },
    });

    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.COMPLETED } });

    return invoice;
  });
}

// Issues a credit note against an already-issued tax invoice for specific disputed items —
// the path used when a dispute resolves as a refund *after* generateInvoiceForOrder already
// ran (e.g. a later shipment's dispute surfaces after the main invoice was issued).
export async function generateCreditNote(disputeId: string) {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUniqueOrThrow({ where: { id: disputeId }, include: { items: true } });
    if (dispute.status !== DisputeStatus.RESOLVED_REFUND) {
      throw new Error(`Dispute ${disputeId} is not resolved as a refund.`);
    }

    const originalInvoice = await tx.invoice.findFirst({
      where: { orderId: dispute.orderId, type: InvoiceType.TAX_INVOICE },
      include: { items: true },
    });
    if (!originalInvoice) {
      throw new Error(`Order ${dispute.orderId} has no tax invoice to credit yet.`);
    }

    const disputedOrderItemIds = new Set(dispute.items.map((i) => i.orderItemId));
    const creditLines = originalInvoice.items.filter(
      (li) => li.orderItemId && disputedOrderItemIds.has(li.orderItemId)
    );
    if (creditLines.length === 0) {
      throw new Error('None of the disputed items were found on the original invoice.');
    }

    const zero = new Prisma.Decimal(0);
    const totals = creditLines.reduce(
      (acc, li) => ({
        subtotal: acc.subtotal.plus(li.taxableValue),
        cgstTotal: acc.cgstTotal.plus(li.cgstAmount),
        sgstTotal: acc.sgstTotal.plus(li.sgstAmount),
        igstTotal: acc.igstTotal.plus(li.igstAmount),
        grandTotal: acc.grandTotal.plus(li.lineTotal),
      }),
      { subtotal: zero, cgstTotal: zero, sgstTotal: zero, igstTotal: zero, grandTotal: zero }
    );

    return tx.invoice.create({
      data: {
        invoiceNumber: await nextInvoiceNumber(tx),
        type: InvoiceType.CREDIT_NOTE,
        orderId: originalInvoice.orderId,
        customerId: originalInvoice.customerId,
        originalInvoiceId: originalInvoice.id,
        disputeId: dispute.id,
        supplyType: originalInvoice.supplyType,
        placeOfSupplyStateCode: originalInvoice.placeOfSupplyStateCode,
        companyStateCode: originalInvoice.companyStateCode,
        customerGstin: originalInvoice.customerGstin,
        customerLegalName: originalInvoice.customerLegalName,
        billingAddressSnapshot: originalInvoice.billingAddressSnapshot as Prisma.InputJsonValue,
        subtotal: totals.subtotal,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        grandTotal: totals.grandTotal,
        items: {
          create: creditLines.map((li) => ({
            orderItemId: li.orderItemId,
            productId: li.productId,
            productName: li.productName,
            hsnCode: li.hsnCode,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            gstRate: li.gstRate,
            taxableValue: li.taxableValue,
            cgstAmount: li.cgstAmount,
            sgstAmount: li.sgstAmount,
            igstAmount: li.igstAmount,
            lineTotal: li.lineTotal,
          })),
        },
      },
    });
  });
}

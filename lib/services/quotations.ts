import { QuotationStatus, OrderStatus, OrderItemStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateLineGst, summarizeInvoiceTotals } from '@/lib/services/gst';
import { generateQuotationNumber, generateOrderNumber } from '@/lib/services/numbering';
import { runSerializable } from '@/lib/services/tx-utils';

export interface QuotationLineInput {
  productId: string;
  quantity: number;
}

// A quotation carries no GST liability of its own (nothing has been billed yet) — it's
// priced using the company's home state as a stand-in place of supply purely to show the
// customer an indicative tax breakdown; the real supply-type determination happens for real
// at checkout, against the customer's actual shipping address.
export async function createQuotation(
  companyId: string,
  createdByUserId: string,
  customerId: string,
  lines: QuotationLineInput[],
  validUntil?: Date,
  notes?: string
) {
  if (lines.length === 0) throw new Error('A quotation needs at least one line item.');

  return runSerializable(async (tx) => {
    const [company, products] = await Promise.all([
      tx.companyProfile.findUniqueOrThrow({ where: { id: companyId } }),
      tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, companyId } }),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const priced = lines.map((line) => {
      const product = productMap.get(line.productId);
      if (!product) throw new Error(`Product ${line.productId} not found.`);
      const gst = calculateLineGst({
        unitPrice: product.sellingPrice,
        quantity: line.quantity,
        gstRate: product.gstRate,
        companyStateCode: company.stateCode,
        placeOfSupplyStateCode: company.stateCode,
      });
      return { product, quantity: line.quantity, gst };
    });
    const totals = summarizeInvoiceTotals(priced.map((p) => p.gst));

    return tx.quotation.create({
      data: {
        companyId,
        quotationNumber: await generateQuotationNumber(tx, companyId),
        customerId,
        createdByUserId,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        validUntil,
        notes,
        items: {
          create: priced.map(({ product, quantity, gst }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.sellingPrice,
            gstRate: product.gstRate,
            lineTotal: gst.lineTotal,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
  });
}

export async function updateQuotationStatus(quotationId: string, status: QuotationStatus) {
  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (quotation.status === QuotationStatus.CONVERTED) {
    throw new Error('This quotation has already been converted to an order and can no longer change status.');
  }
  return prisma.quotation.update({ where: { id: quotationId }, data: { status } });
}

// Turns an accepted quotation into a real order — the customer's default shipping address is
// used to determine actual GST (supply type may differ from the quotation's indicative
// figures), and every line is re-priced from current product data rather than trusting the
// quotation's snapshot, since prices may have moved since it was issued.
export async function convertQuotationToOrder(quotationId: string) {
  return runSerializable(async (tx) => {
    const quotation = await tx.quotation.findUniqueOrThrow({
      where: { id: quotationId },
      include: { items: true, customer: { include: { addresses: true } } },
    });
    if (quotation.status === QuotationStatus.CONVERTED) {
      throw new Error(`Quotation ${quotation.quotationNumber} was already converted.`);
    }

    const address = quotation.customer.addresses.find((a) => a.isDefault) ?? quotation.customer.addresses[0];
    if (!address) throw new Error('This customer has no saved address to ship the order to.');

    const [company, products] = await Promise.all([
      tx.companyProfile.findUniqueOrThrow({ where: { id: quotation.companyId } }),
      tx.product.findMany({ where: { id: { in: quotation.items.map((i) => i.productId) }, companyId: quotation.companyId } }),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const priced = quotation.items.map((line) => {
      const product = productMap.get(line.productId);
      if (!product) throw new Error(`Product ${line.productId} is no longer available.`);
      const gst = calculateLineGst({
        unitPrice: product.sellingPrice,
        quantity: line.quantity,
        gstRate: product.gstRate,
        companyStateCode: company.stateCode,
        placeOfSupplyStateCode: address.stateCode,
      });
      return { product, quantity: line.quantity, gst };
    });
    const totals = summarizeInvoiceTotals(priced.map((p) => p.gst));

    const order = await tx.order.create({
      data: {
        companyId: quotation.companyId,
        orderNumber: await generateOrderNumber(tx, quotation.companyId),
        customerId: quotation.customerId,
        status: OrderStatus.CONFIRMED,
        shippingAddressId: address.id,
        placeOfSupplyStateCode: address.stateCode,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        items: {
          create: priced.map(({ product, quantity, gst }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.sellingPrice,
            gstRate: product.gstRate,
            lineSubtotal: gst.taxableValue,
            lineTax: gst.taxTotal,
            lineTotal: gst.lineTotal,
            status: OrderItemStatus.PENDING,
            fulfillmentType: product.fulfillmentType,
          })),
        },
      },
    });

    await tx.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.CONVERTED, convertedOrderId: order.id },
    });

    return order;
  });
}

export async function listQuotations(companyId: string) {
  return prisma.quotation.findMany({
    where: { companyId },
    include: { customer: { include: { user: true } }, convertedOrder: { select: { orderNumber: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

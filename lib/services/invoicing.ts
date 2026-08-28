import { prisma } from '@/lib/prisma';

interface DecimalLike {
  toNumber: () => number;
}

function dec(value: DecimalLike | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

interface BillingAddressSnapshot {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

// Prisma's Decimal/Date/Json values aren't directly serializable across the Server->Client
// component boundary, so this flattens an Invoice into plain numbers/strings the print
// components can render.
export async function getInvoiceForPrint(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true, order: { select: { orderNumber: true } } },
  });
  const company = await prisma.companyProfile.findUniqueOrThrow({ where: { id: invoice.companyId } });

  return {
    company: {
      legalName: company.legalName,
      gstin: company.gstin,
      stateCode: company.stateCode,
      state: company.state,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      pincode: company.pincode,
      bankName: company.bankName,
      bankAccountName: company.bankAccountName,
      bankAccountNo: company.bankAccountNo,
      bankIfsc: company.bankIfsc,
      invoicePrefix: company.invoicePrefix,
    },
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      issuedAt: invoice.issuedAt.toISOString(),
      supplyType: invoice.supplyType,
      placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
      customerGstin: invoice.customerGstin,
      customerLegalName: invoice.customerLegalName,
      billingAddressSnapshot: invoice.billingAddressSnapshot as unknown as BillingAddressSnapshot,
      orderNumber: invoice.order.orderNumber,
      subtotal: dec(invoice.subtotal),
      cgstTotal: dec(invoice.cgstTotal),
      sgstTotal: dec(invoice.sgstTotal),
      igstTotal: dec(invoice.igstTotal),
      grandTotal: dec(invoice.grandTotal),
      items: invoice.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitPrice: dec(item.unitPrice),
        gstRate: dec(item.gstRate),
        taxableValue: dec(item.taxableValue),
        cgstAmount: dec(item.cgstAmount),
        sgstAmount: dec(item.sgstAmount),
        igstAmount: dec(item.igstAmount),
        lineTotal: dec(item.lineTotal),
      })),
    },
  };
}

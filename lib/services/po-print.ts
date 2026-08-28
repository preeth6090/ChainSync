import { prisma } from '@/lib/prisma';

// Same flattening pattern as getInvoiceForPrint / getShipmentForPrint: Prisma Decimal/Date
// values aren't serializable across the Server->Client boundary, so everything crossing into
// the print component is a plain number/string.
export async function getPurchaseOrderForPrint(purchaseOrderId: string) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id: purchaseOrderId },
    include: {
      vendor: { include: { addresses: true } },
      items: { include: { product: true } },
    },
  });
  const company = await prisma.companyProfile.findUniqueOrThrow({ where: { id: po.companyId } });

  const vendorAddress = po.vendor.addresses[0];

  return {
    company: {
      legalName: company.legalName,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      state: company.state,
      pincode: company.pincode,
      gstin: company.gstin,
    },
    purchaseOrder: {
      poNumber: po.poNumber,
      status: po.status,
      createdAt: po.createdAt.toISOString(),
      approvedAt: po.approvedAt?.toISOString() ?? null,
      totalAmount: Number(po.totalAmount),
      vendor: {
        displayName: po.vendor.displayName,
        legalName: po.vendor.legalName,
        gstin: po.vendor.gstin,
        phone: po.vendor.phone,
        email: po.vendor.email,
        address: vendorAddress
          ? {
              line1: vendorAddress.line1,
              line2: vendorAddress.line2,
              city: vendorAddress.city,
              state: vendorAddress.state,
              pincode: vendorAddress.pincode,
            }
          : null,
      },
      items: po.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    },
  };
}

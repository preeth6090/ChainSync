import { prisma } from '@/lib/prisma';

// A Sale Order document is the customer-facing "this is what you ordered" record — issued at
// checkout, before GST invoicing finalizes at delivery. Same flattening pattern as the other
// print services: Prisma Decimal/Date values aren't serializable across the Server->Client
// boundary.
export async function getOrderForPrint(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      customer: { include: { user: true } },
      shippingAddress: true,
      items: { include: { product: true } },
    },
  });
  const company = await prisma.companyProfile.findUniqueOrThrow({ where: { id: order.companyId } });

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
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      subtotal: Number(order.subtotal),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      customerName: order.customer.legalName ?? order.customer.user.name ?? order.customer.user.email ?? 'Customer',
      customerGstin: order.customer.gstin,
      shippingAddress: {
        line1: order.shippingAddress.line1,
        line2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        pincode: order.shippingAddress.pincode,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        hsnCode: item.product.hsnCode,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        gstRate: Number(item.gstRate),
        lineTotal: Number(item.lineTotal),
      })),
    },
  };
}

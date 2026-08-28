import { prisma } from '@/lib/prisma';

// Delivery challans carry no GST amounts — they document goods physically leaving for
// delivery, billed later (or already billed) via a separate tax invoice. Flattened the same
// way getInvoiceForPrint is: Prisma Decimal/Date values aren't serializable across the
// Server->Client boundary, so this returns plain numbers/strings only.
export async function getShipmentForPrint(shipmentId: string) {
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: {
      order: {
        include: {
          customer: { include: { user: true } },
          shippingAddress: true,
        },
      },
      items: { include: { orderItem: { include: { product: true } } } },
    },
  });
  const company = await prisma.companyProfile.findUniqueOrThrow({ where: { id: shipment.order.companyId } });

  return {
    company: {
      legalName: company.legalName,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      pincode: company.pincode,
      gstin: company.gstin,
    },
    shipment: {
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      dispatchType: shipment.dispatchType,
      status: shipment.status,
      vehicleNumber: shipment.vehicleNumber,
      driverName: shipment.driverName,
      driverPhone: shipment.driverPhone,
      dispatchedAt: shipment.dispatchedAt?.toISOString() ?? null,
      createdAt: shipment.createdAt.toISOString(),
      orderNumber: shipment.order.orderNumber,
      customerName:
        shipment.order.customer.legalName ??
        shipment.order.customer.user.name ??
        shipment.order.customer.user.email ??
        'Customer',
      shippingAddress: {
        line1: shipment.order.shippingAddress.line1,
        line2: shipment.order.shippingAddress.line2,
        city: shipment.order.shippingAddress.city,
        state: shipment.order.shippingAddress.state,
        pincode: shipment.order.shippingAddress.pincode,
      },
      items: shipment.items.map((si) => ({
        id: si.id,
        productName: si.orderItem.product.name,
        sku: si.orderItem.product.sku,
        unit: si.orderItem.product.unit,
        quantity: si.quantity,
      })),
    },
  };
}

export async function listShipments(companyId: string) {
  return prisma.shipment.findMany({
    where: { order: { companyId } },
    include: {
      order: { select: { orderNumber: true, customer: { include: { user: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

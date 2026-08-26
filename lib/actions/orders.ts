'use server';

import { revalidatePath } from 'next/cache';
import { OrderStatus, OrderItemStatus, ReservationStatus, FulfillmentType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireCustomer } from '@/lib/auth-helpers';
import { validateCustomerMoq, reserveStock } from '@/lib/services/inventory';
import { calculateLineGst, summarizeInvoiceTotals } from '@/lib/services/gst';
import { routeOrderFulfillment } from '@/lib/services/order-routing';
import { generateOrderNumber } from '@/lib/services/numbering';
import { runSerializable } from '@/lib/services/tx-utils';

export interface CheckoutLine {
  productId: string;
  quantity: number;
}

// Add-to-cart: enforces min_customer_moq, then places the 15-minute stock hold. The
// customer is resolved from the session — never trust a customerId passed from the client.
//
// The hold only applies to WAREHOUSE_ONLY SKUs. A HYBRID item can legitimately be split
// between warehouse stock and a vendor at checkout, so reserving its *full* cart quantity
// against warehouseStock here would wrongly reject carts the routing engine could still
// fulfill; a DROP_SHIP_ONLY item has no local stock to reserve in the first place.
export async function addToCartAction(productId: string, quantity: number) {
  const customer = await requireCustomer();
  const product = await validateCustomerMoq(productId, quantity);
  if (product.fulfillmentType !== FulfillmentType.WAREHOUSE_ONLY) return null;
  return reserveStock(productId, customer.id, quantity);
}

// Checkout: re-validates MOQ, prices every line through the GST engine, creates the order,
// and immediately hands it to the routing engine. This is the flow behind a customer's
// "Place Order" button.
export async function checkoutOrderAction(shippingAddressId: string, lines: CheckoutLine[]) {
  if (lines.length === 0) throw new Error('Cart is empty.');
  const customer = await requireCustomer();

  const [address, company, products] = await Promise.all([
    prisma.address.findUniqueOrThrow({ where: { id: shippingAddressId } }),
    prisma.companyProfile.findFirstOrThrow(),
    prisma.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } }),
  ]);
  if (address.customerId !== customer.id) {
    throw new Error('This shipping address does not belong to your account.');
  }
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    await validateCustomerMoq(line.productId, line.quantity);
  }

  const priced = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new Error(`Product ${line.productId} not found.`);
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

  const createdOrder = await runSerializable(async (tx) => {
    const orderNumber = await generateOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: OrderStatus.CONFIRMED,
        shippingAddressId,
        placeOfSupplyStateCode: address.stateCode,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        items: {
          create: priced.map((p) => ({
            productId: p.product.id,
            quantity: p.quantity,
            unitPrice: p.product.sellingPrice,
            gstRate: p.product.gstRate,
            lineSubtotal: p.gst.taxableValue,
            lineTax: p.gst.taxTotal,
            lineTotal: p.gst.lineTotal,
            status: OrderItemStatus.PENDING,
            fulfillmentType: p.product.fulfillmentType,
          })),
        },
      },
      include: { items: true },
    });

    // Link each line's still-active cart hold (from addToCartAction) to the order item it
    // became, so routeOrderFulfillment formally consumes it instead of it just expiring
    // unused 15 minutes later. Not finding one (hold already expired, or quantity changed
    // since add-to-cart) isn't fatal — routing still does its own atomic stock check.
    for (const item of order.items) {
      const reservation = await tx.stockReservation.findFirst({
        where: {
          productId: item.productId,
          customerId: customer.id,
          status: ReservationStatus.ACTIVE,
          expiresAt: { gt: new Date() },
          orderItemId: null,
          quantity: item.quantity,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (reservation) {
        await tx.stockReservation.update({ where: { id: reservation.id }, data: { orderItemId: item.id } });
      }
    }

    return order;
  });

  await routeOrderFulfillment(createdOrder.id);
  revalidatePath('/orders');

  // Return only plain scalar fields, not the raw Order row — it carries Decimal fields
  // (subtotal/taxTotal/grandTotal), and a Server Action's return value crosses the same
  // Server->Client serialization boundary a Server Component prop does.
  return { id: createdOrder.id, orderNumber: createdOrder.orderNumber };
}

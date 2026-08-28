import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { OrderStatus, OrderItemStatus, InvoiceType, SupplyType, DisputeReason, DisputeStatus } from '@prisma/client';
import { createSaleReturn, listReturnableOrderItems } from '@/lib/services/sale-returns';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('sale returns service (live DB)', () => {
  let orderId: string | null = null;
  let invoiceIds: string[] = [];

  afterEach(async () => {
    if (orderId) {
      const dispute = await prisma.dispute.findFirst({ where: { orderId } });
      if (dispute) {
        await prisma.disputeItem.deleteMany({ where: { disputeId: dispute.id } });
        await prisma.dispute.delete({ where: { id: dispute.id } }).catch(() => {});
      }
      if (invoiceIds.length) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      orderId = null;
      invoiceIds = [];
    }
  });

  async function buildInvoicedOrder() {
    const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@chainsync.test' } });
    const customer = await prisma.customer.findFirstOrThrow({ include: { addresses: true } });
    const address = customer.addresses[0];
    const product = await prisma.product.findFirstOrThrow({ where: { isActive: true } });
    if (!address) throw new Error('Seeded customer has no address.');

    const order = await prisma.order.create({
      data: {
        companyId: customer.companyId,
        orderNumber: `TEST-RET-${Date.now()}`,
        customerId: customer.id,
        status: OrderStatus.COMPLETED,
        shippingAddressId: address.id,
        placeOfSupplyStateCode: address.stateCode,
        subtotal: product.sellingPrice,
        taxTotal: 0,
        grandTotal: product.sellingPrice,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              unitPrice: product.sellingPrice,
              gstRate: product.gstRate,
              lineSubtotal: product.sellingPrice,
              lineTax: 0,
              lineTotal: product.sellingPrice,
              status: OrderItemStatus.FULFILLED,
              fulfillmentType: product.fulfillmentType,
            },
          ],
        },
      },
      include: { items: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        companyId: customer.companyId,
        invoiceNumber: `TEST-INV-${Date.now()}`,
        type: InvoiceType.TAX_INVOICE,
        orderId: order.id,
        customerId: customer.id,
        supplyType: SupplyType.INTRA_STATE,
        placeOfSupplyStateCode: address.stateCode,
        companyStateCode: address.stateCode,
        customerLegalName: customer.legalName ?? 'Test Customer',
        billingAddressSnapshot: { line1: address.line1, city: address.city, state: address.state, pincode: address.pincode },
        subtotal: product.sellingPrice,
        grandTotal: product.sellingPrice,
        items: {
          create: [
            {
              orderItemId: order.items[0].id,
              productId: product.id,
              productName: product.name,
              hsnCode: product.hsnCode,
              quantity: 1,
              unitPrice: product.sellingPrice,
              gstRate: product.gstRate,
              taxableValue: product.sellingPrice,
              lineTotal: product.sellingPrice,
            },
          ],
        },
      },
    });

    return { admin, order, invoice, product };
  }

  it('issues a credit note and removes the item from the returnable list', async () => {
    const { admin, order, invoice, product } = await buildInvoicedOrder();
    orderId = order.id;
    invoiceIds.push(invoice.id);

    const returnable = await listReturnableOrderItems(order.id);
    expect(returnable).toHaveLength(1);

    const creditNote = await createSaleReturn(order.companyId, admin.id, order.id, [returnable[0].orderItemId], DisputeReason.DAMAGED, 'test return');
    invoiceIds.push(creditNote.id);
    expect(Number(creditNote.grandTotal)).toBe(Number(product.sellingPrice));

    const afterReturn = await listReturnableOrderItems(order.id);
    expect(afterReturn).toHaveLength(0);

    const dispute = await prisma.dispute.findFirstOrThrow({ where: { orderId: order.id } });
    expect(dispute.status).toBe(DisputeStatus.RESOLVED_REFUND);

    const auditRow = await prisma.auditLog.findFirst({
      where: { entityType: 'Invoice', entityId: creditNote.id, action: 'CREDIT_NOTE_ISSUED' },
    });
    expect(auditRow).toBeTruthy();
    expect(auditRow?.actorUserId).toBe(admin.id);
    await prisma.auditLog.deleteMany({ where: { entityId: creditNote.id } });
  });

  it('refuses a return against an order with no tax invoice', async () => {
    const customer = await prisma.customer.findFirstOrThrow({ include: { addresses: true } });
    const address = customer.addresses[0];
    if (!address) return;
    const product = await prisma.product.findFirstOrThrow({ where: { isActive: true } });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@chainsync.test' } });

    const order = await prisma.order.create({
      data: {
        companyId: customer.companyId,
        orderNumber: `TEST-NOINV-${Date.now()}`,
        customerId: customer.id,
        status: OrderStatus.CONFIRMED,
        shippingAddressId: address.id,
        placeOfSupplyStateCode: address.stateCode,
        subtotal: product.sellingPrice,
        taxTotal: 0,
        grandTotal: product.sellingPrice,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 1,
              unitPrice: product.sellingPrice,
              gstRate: product.gstRate,
              lineSubtotal: product.sellingPrice,
              lineTax: 0,
              lineTotal: product.sellingPrice,
              status: OrderItemStatus.PENDING,
              fulfillmentType: product.fulfillmentType,
            },
          ],
        },
      },
      include: { items: true },
    });
    orderId = order.id;

    await expect(
      createSaleReturn(order.companyId, admin.id, order.id, [order.items[0].id], DisputeReason.DAMAGED)
    ).rejects.toThrow(/no tax invoice/);
  });
});

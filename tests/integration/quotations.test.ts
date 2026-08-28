import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createQuotation, updateQuotationStatus, convertQuotationToOrder } from '@/lib/services/quotations';
import { QuotationStatus } from '@prisma/client';
import { hasDatabase } from './helpers';

describe.skipIf(!hasDatabase)('quotations service (live DB)', () => {
  let createdOrderId: string | null = null;
  let createdQuotationId: string | null = null;

  afterEach(async () => {
    if (createdOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.delete({ where: { id: createdOrderId } }).catch(() => {});
      createdOrderId = null;
    }
    if (createdQuotationId) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: createdQuotationId } });
      await prisma.quotation.delete({ where: { id: createdQuotationId } }).catch(() => {});
      createdQuotationId = null;
    }
  });

  it('creates a quotation, accepts it, and converts it into a real order', async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@chainsync.test' } });
    const customer = await prisma.customer.findFirstOrThrow({ include: { addresses: true } });
    const product = await prisma.product.findFirstOrThrow({ where: { isActive: true } });

    const quotation = await createQuotation(admin.id, customer.id, [{ productId: product.id, quantity: 2 }], undefined, 'test');
    createdQuotationId = quotation.id;
    expect(quotation.status).toBe(QuotationStatus.DRAFT);
    expect(Number(quotation.grandTotal)).toBeGreaterThan(0);

    const accepted = await updateQuotationStatus(quotation.id, QuotationStatus.ACCEPTED);
    expect(accepted.status).toBe(QuotationStatus.ACCEPTED);

    if (customer.addresses.length === 0) return; // can't exercise conversion without a shipping address

    const order = await convertQuotationToOrder(quotation.id);
    createdOrderId = order.id;
    expect(order.customerId).toBe(customer.id);

    const converted = await prisma.quotation.findUniqueOrThrow({ where: { id: quotation.id } });
    expect(converted.status).toBe(QuotationStatus.CONVERTED);
    expect(converted.convertedOrderId).toBe(order.id);
  });

  it('refuses to change status on an already-converted quotation', async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { email: 'admin@chainsync.test' } });
    const customer = await prisma.customer.findFirstOrThrow({ include: { addresses: true } });
    if (customer.addresses.length === 0) return;
    const product = await prisma.product.findFirstOrThrow({ where: { isActive: true } });

    const quotation = await createQuotation(admin.id, customer.id, [{ productId: product.id, quantity: 1 }]);
    createdQuotationId = quotation.id;
    await updateQuotationStatus(quotation.id, QuotationStatus.ACCEPTED);
    const order = await convertQuotationToOrder(quotation.id);
    createdOrderId = order.id;

    await expect(updateQuotationStatus(quotation.id, QuotationStatus.REJECTED)).rejects.toThrow(/already been converted/);
  });
});

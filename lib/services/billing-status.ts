import { InvoiceType, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type BillingStatus = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface InvoiceBillingRow {
  invoiceId: string;
  invoiceNumber: string;
  issuedAt: Date;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  grandTotal: number;
  creditedTotal: number;
  paidTotal: number;
  balance: number;
  status: BillingStatus;
}

export interface BillingListFilter {
  from?: Date;
  to?: Date;
  status?: BillingStatus;
  customerId?: string;
}

// Net amount actually owed on a tax invoice, and what's been collected against it. Credit
// notes reduce what's owed (they're child invoices linked via originalInvoiceId); payments
// are matched at the order level since Payment.invoiceId is optional and most orders carry
// exactly one tax invoice.
export async function listInvoicesWithBillingStatus(
  companyId: string,
  filter: BillingListFilter = {}
): Promise<InvoiceBillingRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      type: InvoiceType.TAX_INVOICE,
      ...(filter.customerId ? { customerId: filter.customerId } : {}),
      ...(filter.from || filter.to
        ? { issuedAt: { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) } }
        : {}),
    },
    include: {
      customer: { include: { user: true } },
      order: {
        select: {
          orderNumber: true,
          payments: { where: { status: PaymentStatus.VERIFIED }, select: { amount: true } },
        },
      },
      creditNote: { select: { grandTotal: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  const rows = invoices.map((invoice) => {
    const grandTotal = Number(invoice.grandTotal);
    const creditedTotal = invoice.creditNote ? Number(invoice.creditNote.grandTotal) : 0;
    const paidTotal = invoice.order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const netDue = grandTotal - creditedTotal;
    const balance = Math.max(0, netDue - paidTotal);
    const status: BillingStatus = balance <= 0 ? 'PAID' : paidTotal > 0 ? 'PARTIAL' : 'UNPAID';

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      orderId: invoice.orderId,
      orderNumber: invoice.order.orderNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerLegalName ?? invoice.customer.user.name ?? invoice.customer.user.email ?? 'Customer',
      grandTotal,
      creditedTotal,
      paidTotal,
      balance,
      status,
    };
  });

  return filter.status ? rows.filter((r) => r.status === filter.status) : rows;
}

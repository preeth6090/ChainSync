import { InvoiceType, PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface PartyRow {
  customerId: string;
  name: string;
  gstin: string | null;
  outstandingBalance: number;
}

// One row per customer with their running outstanding balance across every tax invoice they
// hold — the "Parties" list. Balance is derived the same way as billing-status.ts (grandTotal
// minus credit notes minus verified payments), just aggregated per customer instead of per invoice.
export async function listPartyBalances(companyId: string): Promise<PartyRow[]> {
  const customers = await prisma.customer.findMany({
    where: { companyId },
    include: {
      user: true,
      invoices: {
        where: { type: InvoiceType.TAX_INVOICE },
        include: {
          order: { select: { payments: { where: { status: PaymentStatus.VERIFIED }, select: { amount: true } } } },
          creditNote: { select: { grandTotal: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => {
    const outstandingBalance = c.invoices.reduce((sum, inv) => {
      const grandTotal = Number(inv.grandTotal);
      const creditedTotal = inv.creditNote ? Number(inv.creditNote.grandTotal) : 0;
      const paidTotal = inv.order.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + Math.max(0, grandTotal - creditedTotal - paidTotal);
    }, 0);

    return {
      customerId: c.id,
      name: c.legalName ?? c.user.name ?? c.user.email ?? 'Customer',
      gstin: c.gstin,
      outstandingBalance,
    };
  });
}

export interface PartyDetail {
  customerId: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string | null;
}

export async function getPartyDetail(companyId: string, customerId: string): Promise<PartyDetail | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      user: true,
      addresses: { where: { type: 'BILLING' }, take: 1 },
    },
  });
  if (!customer || customer.companyId !== companyId) return null;

  const billingAddress = customer.addresses[0]
    ? `${customer.addresses[0].line1}${customer.addresses[0].line2 ? `, ${customer.addresses[0].line2}` : ''}, ${customer.addresses[0].city}, ${customer.addresses[0].state} - ${customer.addresses[0].pincode}`
    : null;

  return {
    customerId: customer.id,
    name: customer.legalName ?? customer.user.name ?? customer.user.email ?? 'Customer',
    gstin: customer.gstin,
    phone: customer.user.phone,
    email: customer.user.email,
    billingAddress,
  };
}

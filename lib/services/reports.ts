import { InvoiceType, PaymentMode, PaymentStatus, PayableStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const ALL_MODES: PaymentMode[] = [
  PaymentMode.CASH,
  PaymentMode.UPI,
  PaymentMode.NEFT,
  PaymentMode.RTGS,
  PaymentMode.CHEQUE,
  PaymentMode.CARD,
];

export interface CashAndBankRow {
  mode: PaymentMode;
  moneyIn: number;
  moneyOut: number;
  netPosition: number;
}

// A position-by-payment-mode view rather than a true multi-account bank ledger — there's no
// BankAccount model, and VendorPayable (what's paid out to vendors) isn't tagged with a mode,
// so vendor payouts can't be attributed to CASH vs NEFT etc. here. Money out is expenses only;
// vendor payables paid are surfaced separately in the business summary below.
export async function getCashAndBankPosition(companyId: string): Promise<CashAndBankRow[]> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.groupBy({
      by: ['mode'],
      where: { status: PaymentStatus.VERIFIED, order: { companyId } },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ['paidVia'],
      where: { companyId },
      _sum: { amount: true },
    }),
  ]);

  const inByMode = new Map(payments.map((p) => [p.mode, Number(p._sum.amount ?? 0)]));
  const outByMode = new Map(expenses.map((e) => [e.paidVia, Number(e._sum.amount ?? 0)]));

  return ALL_MODES.map((mode) => {
    const moneyIn = inByMode.get(mode) ?? 0;
    const moneyOut = outByMode.get(mode) ?? 0;
    return { mode, moneyIn, moneyOut, netPosition: moneyIn - moneyOut };
  });
}

export interface BusinessSummary {
  totalSales: number;
  totalReceived: number;
  totalOutstandingFromCustomers: number;
  totalPurchases: number;
  totalPaidToVendors: number;
  outstandingToVendors: number;
  totalExpenses: number;
  netCashPosition: number;
}

export async function getBusinessSummary(companyId: string): Promise<BusinessSummary> {
  const [invoices, payables, expenseTotal] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, type: InvoiceType.TAX_INVOICE },
      select: {
        grandTotal: true,
        creditNote: { select: { grandTotal: true } },
        order: { select: { payments: { where: { status: PaymentStatus.VERIFIED }, select: { amount: true } } } },
      },
    }),
    prisma.vendorPayable.findMany({ where: { vendor: { companyId } }, select: { amount: true, status: true } }),
    prisma.expense.aggregate({ where: { companyId }, _sum: { amount: true } }),
  ]);

  let totalSales = 0;
  let totalReceived = 0;
  let totalOutstandingFromCustomers = 0;

  for (const inv of invoices) {
    const grandTotal = Number(inv.grandTotal);
    const credited = inv.creditNote ? Number(inv.creditNote.grandTotal) : 0;
    const paid = inv.order.payments.reduce((s, p) => s + Number(p.amount), 0);
    totalSales += grandTotal;
    totalReceived += paid;
    totalOutstandingFromCustomers += Math.max(0, grandTotal - credited - paid);
  }

  const totalPurchases = payables.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaidToVendors = payables
    .filter((p) => p.status === PayableStatus.PAID)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstandingToVendors = payables
    .filter((p) => p.status === PayableStatus.PENDING || p.status === PayableStatus.APPROVED)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = Number(expenseTotal._sum.amount ?? 0);

  return {
    totalSales,
    totalReceived,
    totalOutstandingFromCustomers,
    totalPurchases,
    totalPaidToVendors,
    outstandingToVendors,
    totalExpenses,
    netCashPosition: totalReceived - totalPaidToVendors - totalExpenses,
  };
}

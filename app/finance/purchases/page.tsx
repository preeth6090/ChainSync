import { redirect } from 'next/navigation';
import { UserRole, PayableStatus } from '@prisma/client';
import { Truck, Wallet, ReceiptText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listExpenses } from '@/lib/services/expenses';
import { getActiveCompanyId } from '@/lib/services/firm-context';
import { AppShell } from '@/components/layout/app-shell';
import { AddExpenseForm } from '@/components/finance/add-expense-form';
import { ReleasePayableButton } from '@/components/finance/release-payable-button';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const PAYABLE_STYLE: Record<PayableStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  ON_HOLD: 'bg-rose-50 text-rose-700',
};

export default async function PurchaseAndExpensePage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/finance/purchases');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const companyId = await getActiveCompanyId(session.user.id);
  const [payables, expenses] = await Promise.all([
    prisma.vendorPayable.findMany({
      where: { vendor: { companyId } },
      include: { vendor: true, vendorBill: { select: { billNumber: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    listExpenses(companyId),
  ]);

  const outstandingPayables = payables
    .filter((p) => p.status === PayableStatus.PENDING || p.status === PayableStatus.APPROVED)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalPurchases = payables.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Purchase &amp; Expense</h1>
            <p className="text-sm text-slate-500">What the business owes vendors, and what it spends to run.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Truck size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Purchases</p>
              <p className="text-xl font-extrabold text-slate-900">{inr.format(totalPurchases)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Outstanding to Vendors</p>
              <p className="text-xl font-extrabold text-rose-700">{inr.format(outstandingPayables)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ReceiptText size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Expenses</p>
              <p className="text-xl font-extrabold text-slate-900">{inr.format(totalExpenses)}</p>
            </div>
          </div>
        </div>

        {/* Vendor payables */}
        <section className="mt-8">
          <h2 className="text-base font-extrabold text-slate-900">Vendor Payables</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            {payables.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No vendor bills matched for payment yet.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Bill No</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.vendor.displayName}</td>
                      <td className="px-4 py-3 text-slate-500">{p.vendorBill.billNumber}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                        {inr.format(Number(p.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${PAYABLE_STYLE[p.status]}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(p.status === PayableStatus.PENDING || p.status === PayableStatus.APPROVED) && (
                          <ReleasePayableButton payableId={p.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Expenses */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Expenses</h2>
            <AddExpenseForm />
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            {expenses.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No expenses recorded yet.</p>
            ) : (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Paid Via</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(e.expenseDate)}</td>
                      <td className="px-4 py-3 text-slate-700">{e.category.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-slate-700">{e.description}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                        {inr.format(Number(e.amount))}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{e.paidVia}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

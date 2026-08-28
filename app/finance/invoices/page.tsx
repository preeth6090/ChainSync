import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Receipt, IndianRupee, Wallet, AlertCircle, Printer } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listInvoicesWithBillingStatus, type BillingStatus } from '@/lib/services/billing-status';
import { getActiveCompanyId } from '@/lib/services/firm-context';
import { AppShell } from '@/components/layout/app-shell';
import { RecordPaymentForm } from '@/components/finance/record-payment-form';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_STYLE: Record<BillingStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-rose-50 text-rose-700',
};

const STATUS_TABS: { label: string; value: BillingStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Unpaid', value: 'UNPAID' },
];

export default async function SaleInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/finance/invoices');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const { status, from, to } = await searchParams;
  const statusFilter = status && status !== 'ALL' ? (status as BillingStatus) : undefined;

  const companyId = await getActiveCompanyId(session.user.id);
  const rows = await listInvoicesWithBillingStatus(companyId, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(`${to}T23:59:59`) : undefined,
    status: statusFilter,
  });

  const totalSales = rows.reduce((sum, r) => sum + r.grandTotal, 0);
  const totalReceived = rows.reduce((sum, r) => sum + r.paidTotal, 0);
  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);

  function qs(next: Partial<{ status: string; from: string; to: string }>) {
    const params = new URLSearchParams({ status: status ?? 'ALL', from: from ?? '', to: to ?? '', ...next });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    const s = params.toString();
    return s ? `/finance/invoices?${s}` : '/finance/invoices';
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md">
            <Receipt size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Sale Invoices</h1>
            <p className="text-sm text-slate-500">{rows.length} invoice(s) in this view.</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IndianRupee size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Sales Amount</p>
              <p className="text-xl font-extrabold text-slate-900">{inr.format(totalSales)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Received</p>
              <p className="text-xl font-extrabold text-emerald-700">{inr.format(totalReceived)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance</p>
              <p className="text-xl font-extrabold text-rose-700">{inr.format(totalBalance)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={qs({ status: tab.value })}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  (status ?? 'ALL') === tab.value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <form className="flex flex-wrap items-center gap-2 text-xs" action="/finance/invoices">
            <input type="hidden" name="status" value={status ?? 'ALL'} />
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-lg border border-slate-200 px-2 py-1.5"
            />
            <span className="text-slate-400">to</span>
            <input type="date" name="to" defaultValue={to} className="rounded-lg border border-slate-200 px-2 py-1.5" />
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 font-bold text-white">
              Apply
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No invoices match this filter.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Invoice No</th>
                  <th className="px-4 py-3">Party Name</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.invoiceId} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(row.issuedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{row.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{row.customerName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                      {inr.format(row.grandTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                      {inr.format(row.balance)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[row.status]}`}>
                        {row.status === 'PAID' ? 'Paid' : row.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/invoices/${row.invoiceId}`}
                          target="_blank"
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          <Printer size={12} /> View
                        </Link>
                        {row.status !== 'PAID' && (
                          <RecordPaymentForm
                            orderId={row.orderId}
                            invoiceId={row.invoiceId}
                            suggestedAmount={row.balance}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </AppShell>
  );
}

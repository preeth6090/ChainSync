import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Users, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listPartyBalances, getPartyDetail } from '@/lib/services/party-ledger';
import { listInvoicesWithBillingStatus, type BillingStatus } from '@/lib/services/billing-status';
import { AppShell } from '@/components/layout/app-shell';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_STYLE: Record<BillingStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700',
  PARTIAL: 'bg-amber-50 text-amber-700',
  UNPAID: 'bg-rose-50 text-rose-700',
};

export default async function PartiesPage({ searchParams }: { searchParams: Promise<{ party?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/finance/parties');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const { party } = await searchParams;
  const parties = await listPartyBalances();
  const selectedId = party ?? parties[0]?.customerId;

  const [detail, transactions] = selectedId
    ? await Promise.all([getPartyDetail(selectedId), listInvoicesWithBillingStatus({ customerId: selectedId })])
    : [null, []];

  if (party && !detail) notFound();

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Parties</h1>
            <p className="text-sm text-slate-500">{parties.length} customer account(s).</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Party list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {parties.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-400">No customers yet.</p>
            ) : (
              <ul className="max-h-[70vh] divide-y divide-slate-50 overflow-y-auto">
                {parties.map((p) => (
                  <li key={p.customerId}>
                    <Link
                      href={`/finance/parties?party=${p.customerId}`}
                      className={`flex items-center justify-between gap-2 px-4 py-3 text-sm transition ${
                        p.customerId === selectedId ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0 truncate font-semibold text-slate-800">{p.name}</span>
                      <span
                        className={`shrink-0 font-bold ${p.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {inr.format(p.outstandingBalance)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Party detail */}
          {detail ? (
            <div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-lg font-extrabold text-slate-900">{detail.name}</p>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <FileText size={14} className="shrink-0 text-slate-400" />
                    GSTIN: {detail.gstin ?? 'Not provided'}
                  </p>
                  {detail.phone && (
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0 text-slate-400" />
                      {detail.phone}
                    </p>
                  )}
                  {detail.email && (
                    <p className="flex items-center gap-2">
                      <Mail size={14} className="shrink-0 text-slate-400" />
                      {detail.email}
                    </p>
                  )}
                  {detail.billingAddress && (
                    <p className="flex items-start gap-2 sm:col-span-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      {detail.billingAddress}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">Transactions</p>
                {transactions.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-400">No transactions yet.</p>
                ) : (
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Number</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t) => (
                        <tr key={t.invoiceId} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-3 text-slate-700">Sale</td>
                          <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">
                            {t.invoiceNumber}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(t.issuedAt)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                            {inr.format(t.grandTotal)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                            {inr.format(t.balance)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[t.status]}`}>
                              {t.status === 'PAID' ? 'Paid' : t.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-sm text-slate-400">
              Select a party to see their details.
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}

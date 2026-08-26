import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { BarChart3, Landmark, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getCashAndBankPosition, getBusinessSummary } from '@/lib/services/reports';
import { SiteHeader } from '@/components/layout/site-header';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/finance/reports');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const [cashAndBank, summary] = await Promise.all([getCashAndBankPosition(), getBusinessSummary()]);
  const totalCash = cashAndBank.reduce((sum, r) => sum + r.netPosition, 0);

  return (
    <div className="min-h-dvh bg-slate-50">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Cash &amp; Bank + Reports</h1>
            <p className="text-sm text-slate-500">Where the business's money is, and where it went.</p>
          </div>
        </div>

        {/* Business summary */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard icon={TrendingUp} label="Total Sales" value={summary.totalSales} tone="indigo" />
          <SummaryCard icon={TrendingUp} label="Received from Customers" value={summary.totalReceived} tone="emerald" />
          <SummaryCard icon={Scale} label="Outstanding from Customers" value={summary.totalOutstandingFromCustomers} tone="rose" />
          <SummaryCard icon={TrendingDown} label="Total Purchases" value={summary.totalPurchases} tone="amber" />
          <SummaryCard icon={TrendingDown} label="Paid to Vendors" value={summary.totalPaidToVendors} tone="slate" />
          <SummaryCard icon={Scale} label="Outstanding to Vendors" value={summary.outstandingToVendors} tone="rose" />
          <SummaryCard icon={TrendingDown} label="Total Expenses" value={summary.totalExpenses} tone="amber" />
          <SummaryCard
            icon={Landmark}
            label="Net Cash Position"
            value={summary.netCashPosition}
            tone={summary.netCashPosition >= 0 ? 'emerald' : 'rose'}
          />
        </section>

        {/* Cash & Bank by mode */}
        <section className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-extrabold text-slate-900">Cash &amp; Bank Position</h2>
            <p className="text-sm font-bold text-slate-500">
              Total: <span className={totalCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{inr.format(totalCash)}</span>
            </p>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Money in (verified customer payments) minus money out (recorded expenses), grouped by payment mode.
            Vendor payouts aren&apos;t tagged with a mode yet, so they show only in the summary above.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cashAndBank.map((row) => (
              <div key={row.mode} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{row.mode}</p>
                  <Landmark size={16} className="text-slate-300" />
                </div>
                <p className={`mt-2 text-xl font-extrabold ${row.netPosition >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                  {inr.format(row.netPosition)}
                </p>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>In: {inr.format(row.moneyIn)}</span>
                  <span>Out: {inr.format(row.moneyOut)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: number;
  tone: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
}) {
  const toneClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  const textTone: Record<string, string> = {
    indigo: 'text-slate-900',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    amber: 'text-slate-900',
    slate: 'text-slate-900',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-lg font-extrabold ${textTone[tone]}`}>{inr.format(value)}</p>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { UserRole, QuotationStatus } from '@prisma/client';
import { FileText } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listQuotations } from '@/lib/services/quotations';
import { getActiveCompanyId } from '@/lib/services/firm-context';
import { AppShell } from '@/components/layout/app-shell';
import { CreateQuotationForm } from '@/components/sales/create-quotation-form';
import { QuotationActions } from '@/components/sales/quotation-actions';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_STYLE: Record<QuotationStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
  EXPIRED: 'bg-slate-100 text-slate-500',
  CONVERTED: 'bg-indigo-50 text-indigo-700',
};

export default async function QuotationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/sales/quotations');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const companyId = await getActiveCompanyId(session.user.id);
  const [quotations, customers, products] = await Promise.all([
    listQuotations(companyId),
    prisma.customer.findMany({ where: { companyId }, include: { user: true }, orderBy: { createdAt: 'desc' } }),
    prisma.product.findMany({ where: { companyId, isActive: true }, orderBy: { name: 'asc' } }),
  ]);

  const customerOptions = customers.map((c) => ({
    id: c.id,
    name: c.legalName ?? c.user.name ?? c.user.email ?? 'Customer',
  }));
  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unitPrice: Number(p.sellingPrice),
  }));

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-md">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Estimates &amp; Quotations</h1>
              <p className="text-sm text-slate-500">{quotations.length} quotation(s).</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {customerOptions.length === 0 || productOptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
              {customerOptions.length === 0 ? 'No customers yet.' : 'No active products yet.'} Add some before creating a quotation.
            </p>
          ) : (
            <CreateQuotationForm customers={customerOptions} products={productOptions} />
          )}
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {quotations.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No quotations yet.</p>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{q.quotationNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {q.customer.legalName ?? q.customer.user.name ?? q.customer.user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(q.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                      {inr.format(Number(q.grandTotal))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[q.status]}`}>
                        {q.status}
                      </span>
                      {q.convertedOrder && (
                        <p className="mt-1 text-[11px] text-slate-400">&rarr; {q.convertedOrder.orderNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <QuotationActions quotationId={q.id} status={q.status} />
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

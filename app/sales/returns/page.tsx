import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { Undo2, Printer } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listCreditNotes } from '@/lib/services/sale-returns';
import { SiteHeader } from '@/components/layout/site-header';
import { SaleReturnForm } from '@/components/sales/sale-return-form';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default async function SaleReturnsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/sales/returns');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const creditNotes = await listCreditNotes();

  return (
    <div className="min-h-dvh bg-slate-50">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-md">
            <Undo2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Sale Returns &amp; Credit Notes</h1>
            <p className="text-sm text-slate-500">{creditNotes.length} credit note(s) issued.</p>
          </div>
        </div>

        <div className="mt-6">
          <SaleReturnForm />
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {creditNotes.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No credit notes issued yet.</p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Credit Note No</th>
                  <th className="px-4 py-3">Against Invoice</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{cn.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-500">{cn.originalInvoice?.invoiceNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{cn.order.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {cn.customerLegalName ?? cn.customer.user.name ?? cn.customer.user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateFmt.format(cn.issuedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-rose-700">
                      -{inr.format(Number(cn.grandTotal))}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${cn.id}`}
                        target="_blank"
                        className="flex w-fit items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <Printer size={12} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

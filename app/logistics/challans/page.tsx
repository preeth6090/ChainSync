import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole, ShipmentStatus } from '@prisma/client';
import { Truck, Printer } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listShipments } from '@/lib/services/delivery-challan';
import { getActiveCompanyId } from '@/lib/services/firm-context';
import { AppShell } from '@/components/layout/app-shell';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE, UserRole.WAREHOUSE_STAFF];

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const STATUS_STYLE: Record<ShipmentStatus, string> = {
  PENDING: 'bg-slate-100 text-slate-600',
  DISPATCHED: 'bg-blue-50 text-blue-700',
  IN_TRANSIT: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  DISPUTE_WINDOW_OPEN: 'bg-amber-50 text-amber-700',
  FINALIZED: 'bg-emerald-50 text-emerald-700',
  RETURNED: 'bg-rose-50 text-rose-700',
};

export default async function DeliveryChallansListPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/logistics/challans');
  if (!STAFF_ROLES.includes(session.user.role)) redirect('/');

  const companyId = await getActiveCompanyId(session.user.id);
  const shipments = await listShipments(companyId);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-6 py-10 pb-24">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
            <Truck size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Delivery Challans</h1>
            <p className="text-sm text-slate-500">{shipments.length} shipment(s) dispatched or in progress.</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          {shipments.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No shipments yet.</p>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Challan No</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{s.shipmentNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{s.order.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.order.customer.legalName ?? s.order.customer.user.name ?? s.order.customer.user.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {dateFmt.format(s.dispatchedAt ?? s.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[s.status]}`}>
                        {s.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/delivery-challan/${s.id}`}
                        target="_blank"
                        className="flex w-fit items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <Printer size={12} /> Print
                      </Link>
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

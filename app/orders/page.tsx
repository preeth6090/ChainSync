import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Printer } from 'lucide-react';
import { formatInr, formatDate } from '@/lib/format';
import { getActiveCompanyId } from '@/lib/services/firm-context';
import { AppShell } from '@/components/layout/app-shell';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PROCUREMENT_MAKER, UserRole.PROCUREMENT_CHECKER, UserRole.FINANCE];

export default async function OrdersListPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/orders');

  const isStaff = STAFF_ROLES.includes(session.user.role);
  let customerId: string | undefined;

  if (!isStaff) {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer) redirect('/');
    customerId = customer.id;
  }

  const companyId = await getActiveCompanyId(session.user.id);
  const orders = await prisma.order.findMany({
    where: customerId ? { customerId } : { companyId },
    include: { customer: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">{isStaff ? 'Sale Orders' : 'Your Orders'}</h1>
        {orders.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
            {isStaff ? 'No orders yet.' : "You haven't placed any orders yet."}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((order) => (
              <li className="flex items-center gap-2" key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
                >
                  <div>
                    <p className="font-bold text-slate-900">{order.orderNumber}</p>
                    <p className="text-sm text-slate-400">
                      {formatDate(order.createdAt)}
                      {isStaff ? ` · ${order.customer.legalName ?? order.customer.user.name ?? order.customer.user.email}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{formatInr(order.grandTotal)}</p>
                    <p className="text-xs font-semibold text-slate-400">{order.status.replaceAll('_', ' ')}</p>
                  </div>
                </Link>
                <Link
                  href={`/sale-order/${order.id}`}
                  target="_blank"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                  title="Print Sale Order"
                >
                  <Printer size={16} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}

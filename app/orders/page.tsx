import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatInr, formatDate } from '@/lib/format';

export default async function OrdersListPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/orders');

  const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
  if (!customer) redirect('/');

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-extrabold text-slate-900">Your Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300"
              >
                <div>
                  <p className="font-bold text-slate-900">{order.orderNumber}</p>
                  <p className="text-sm text-slate-400">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-700">{formatInr(order.grandTotal)}</p>
                  <p className="text-xs font-semibold text-slate-400">{order.status.replaceAll('_', ' ')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

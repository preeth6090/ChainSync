import { notFound, redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatInr, formatDate } from '@/lib/format';
import { DisputeForm } from '@/components/orders/dispute-form';
import { PaymentForm } from '@/components/orders/payment-form';
import { GenerateInvoiceButton } from '@/components/procurement/generate-invoice-button';

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE];

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      shipments: {
        include: { items: true, proofs: true, disputes: { include: { items: true } } },
        orderBy: { createdAt: 'asc' },
      },
      invoices: true,
      payments: true,
    },
  });
  if (!order) notFound();

  const isStaff = STAFF_ROLES.includes(session.user.role);
  if (!isStaff) {
    const customer = await prisma.customer.findUnique({ where: { userId: session.user.id } });
    if (!customer || order.customerId !== customer.id) notFound();
  }

  const taxInvoice = order.invoices.find((inv) => inv.type === 'TAX_INVOICE');
  const paidAmount = order.payments
    .filter((p) => p.status === 'VERIFIED')
    .reduce((sum, p) => sum + p.amount.toNumber(), 0);
  const invoiceTotal = taxInvoice ? taxInvoice.grandTotal.toNumber() : null;
  const amountDue = invoiceTotal !== null ? Math.max(0, invoiceTotal - paidAmount) : null;
  const hasPendingPayment = order.payments.some((p) => p.status === 'PENDING_VERIFICATION');

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 pb-24">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Order</p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">{order.orderNumber}</h1>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
          {order.status.replaceAll('_', ' ')}
        </span>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Items</p>
        <ul className="mt-3 divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{item.product.name}</p>
                <p className="text-slate-400">
                  Qty {item.quantity} &middot; {item.status.replaceAll('_', ' ')}
                </p>
              </div>
              <p className="font-semibold text-slate-700">{formatInr(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Shipments</h2>
        {order.shipments.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
            Nothing dispatched yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {order.shipments.map((shipment) => {
              const openDispute = shipment.disputes.find((d) => d.status === 'OPEN' || d.status === 'INVESTIGATING');
              const windowOpen =
                shipment.status === 'DISPUTE_WINDOW_OPEN' &&
                shipment.disputeWindowEndsAt !== null &&
                shipment.disputeWindowEndsAt > new Date();

              return (
                <li key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{shipment.shipmentNumber}</p>
                    <span className="text-xs font-semibold text-slate-400">
                      {shipment.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  {shipment.trackingLink && (
                    <a
                      href={shipment.trackingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-sm font-semibold text-indigo-600"
                    >
                      Track shipment
                    </a>
                  )}
                  {shipment.deliveredAt && (
                    <p className="mt-1 text-xs text-slate-400">Delivered {formatDate(shipment.deliveredAt)}</p>
                  )}

                  {openDispute ? (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                      Dispute reported — under review.
                    </p>
                  ) : (
                    windowOpen &&
                    !isStaff && (
                      <DisputeForm
                        orderId={order.id}
                        shipmentId={shipment.id}
                        items={shipment.items.map((si) => {
                          const orderItem = order.items.find((oi) => oi.id === si.orderItemId);
                          return {
                            orderItemId: si.orderItemId,
                            name: orderItem?.product.name ?? 'Item',
                            quantity: si.quantity,
                          };
                        })}
                      />
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {taxInvoice && (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Invoice {taxInvoice.invoiceNumber}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatInr(amountDue ?? 0)}</p>
              <p className="text-xs text-slate-400">
                {amountDue === 0 ? 'Paid in full' : `of ${formatInr(invoiceTotal ?? 0)} due`}
              </p>
            </div>
            <a href={`/invoices/${taxInvoice.id}`} className="text-sm font-semibold text-indigo-600">
              View invoice
            </a>
          </div>

          {amountDue !== null &&
            amountDue > 0 &&
            !isStaff &&
            (hasPendingPayment ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                Payment submitted — awaiting verification.
              </p>
            ) : (
              <PaymentForm orderId={order.id} invoiceId={taxInvoice.id} amountDue={amountDue} />
            ))}
        </section>
      )}

      {!taxInvoice && isStaff && (
        <section className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">No invoice yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Normally generated automatically once every shipment&apos;s 24-hour dispute window closes undisputed.
          </p>
          <div className="mt-3">
            <GenerateInvoiceButton orderId={order.id} />
          </div>
        </section>
      )}
    </main>
  );
}

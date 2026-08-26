import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatInr } from '@/lib/format';
import {
  SubmitPoButton,
  ApprovePoButton,
  RejectPoButton,
  MoqConflictActions,
  MarkDeliveredButton,
  ResolveDisputeButtons,
  RunThreeWayMatchButton,
  ReleasePayableButton,
  VerifyPaymentButton,
  RejectPaymentButton,
} from '@/components/procurement/action-buttons';
import { GoodsReceiptForm } from '@/components/procurement/goods-receipt-form';
import { VendorBillForm, type BillablePo } from '@/components/procurement/vendor-bill-form';

const DASHBOARD_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.PROCUREMENT_MAKER,
  UserRole.PROCUREMENT_CHECKER,
  UserRole.FINANCE,
  UserRole.WAREHOUSE_STAFF,
];

export default async function ProcurementDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/procurement');
  if (!DASHBOARD_ROLES.includes(session.user.role)) redirect('/');

  const [
    draftPOs,
    pendingApprovalPOs,
    moqConflicts,
    shipmentsAwaitingDelivery,
    openDisputes,
    receivablePOs,
    billablePOsRaw,
    vendorBills,
    pendingPayables,
    pendingPayments,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { status: 'DRAFT' },
      include: { vendor: true, items: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: { vendor: true, items: true, maker: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.moqConflictAlert.findMany({
      where: { status: 'OPEN' },
      include: {
        orderItem: { include: { product: true, order: true } },
        vendorCatalog: { include: { vendor: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.shipment.findMany({
      where: { status: 'DISPATCHED' },
      include: { order: true },
      orderBy: { dispatchedAt: 'asc' },
    }),
    prisma.dispute.findMany({
      where: { status: { in: ['OPEN', 'INVESTIGATING'] } },
      include: { order: true, items: { include: { orderItem: { include: { product: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ['DISPATCHED', 'PARTIALLY_RECEIVED'] } },
      include: { vendor: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: { in: ['DISPATCHED', 'PARTIALLY_RECEIVED', 'RECEIVED'] }, vendorBills: { none: {} } },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.vendorBill.findMany({
      where: { matchStatus: { in: ['PENDING', 'MISMATCHED'] } },
      include: { vendor: true, purchaseOrder: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.vendorPayable.findMany({
      where: { status: 'PENDING' },
      include: { vendor: true, vendorBill: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { status: 'PENDING_VERIFICATION' },
      include: { order: true, customer: { include: { user: true } } },
      orderBy: { submittedAt: 'asc' },
    }),
  ]);

  const currentUserId = session.user.id;

  const receivableLines = receivablePOs.flatMap((po) =>
    po.items
      .filter((item) => item.receivedQuantity < item.quantity)
      .map((item) => ({
        poNumber: po.poNumber,
        purchaseOrderItemId: item.id,
        productName: item.product.name,
        remaining: item.quantity - item.receivedQuantity,
      }))
  );

  const billablePOs: BillablePo[] = billablePOsRaw.map((po) => ({
    id: po.id,
    poNumber: po.poNumber,
    items: po.items.map((item) => ({
      id: item.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toNumber(),
    })),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 pb-24">
      <h1 className="text-2xl font-extrabold text-slate-900">Procurement Desk</h1>
      <p className="mt-1 text-sm text-slate-500">
        Maker-checker approvals, MOQ exceptions, delivery confirmation, disputes, and 3-way match review.
      </p>

      <Section title={`Draft POs Awaiting Submission (${draftPOs.length})`}>
        {draftPOs.length === 0 ? (
          <EmptyState text="No draft purchase orders." />
        ) : (
          <ul className="space-y-3">
            {draftPOs.map((po) => (
              <li key={po.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {po.poNumber} &middot; {po.vendor.displayName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {po.items.length} line(s) &middot; {formatInr(po.totalAmount)}
                      {po.requiresApproval ? ' · requires checker approval' : ' · auto-approves on submit'}
                    </p>
                  </div>
                  <SubmitPoButton poId={po.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Pending Approval (${pendingApprovalPOs.length})`}>
        {pendingApprovalPOs.length === 0 ? (
          <EmptyState text="No purchase orders waiting on a checker." />
        ) : (
          <ul className="space-y-3">
            {pendingApprovalPOs.map((po) => (
              <li key={po.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {po.poNumber} &middot; {po.vendor.displayName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {po.items.length} line(s) &middot; {formatInr(po.totalAmount)} &middot; maker:{' '}
                      {po.maker?.name ?? po.maker?.email ?? '—'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <ApprovePoButton poId={po.id} disabled={po.makerId === currentUserId} />
                    <RejectPoButton poId={po.id} />
                  </div>
                </div>
                {po.makerId === currentUserId && (
                  <p className="mt-2 text-xs font-semibold text-amber-600">
                    You created this PO — a different checker must approve it.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`MOQ Conflicts (${moqConflicts.length})`}>
        {moqConflicts.length === 0 ? (
          <EmptyState text="No open MOQ conflicts." />
        ) : (
          <ul className="space-y-3">
            {moqConflicts.map((alert) => (
              <li key={alert.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {alert.orderItem.product.sku} &middot; order {alert.orderItem.order.orderNumber}
                    </p>
                    <p className="text-sm text-slate-600">
                      Customer wants {alert.customerQty}; {alert.vendorCatalog.vendor.displayName}&apos;s MOQ is{' '}
                      {alert.vendorMoq}.
                    </p>
                  </div>
                  <MoqConflictActions alertId={alert.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Shipments Awaiting Delivery Confirmation (${shipmentsAwaitingDelivery.length})`}>
        {shipmentsAwaitingDelivery.length === 0 ? (
          <EmptyState text="Nothing dispatched and unconfirmed." />
        ) : (
          <ul className="space-y-3">
            {shipmentsAwaitingDelivery.map((shipment) => (
              <li key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{shipment.shipmentNumber}</p>
                    <p className="text-sm text-slate-500">Order {shipment.order.orderNumber}</p>
                  </div>
                  <MarkDeliveredButton shipmentId={shipment.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Open Disputes (${openDisputes.length})`}>
        {openDisputes.length === 0 ? (
          <EmptyState text="No open disputes." />
        ) : (
          <ul className="space-y-3">
            {openDisputes.map((dispute) => (
              <li key={dispute.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="font-bold text-slate-900">Order {dispute.order.orderNumber}</p>
                <p className="mt-1 text-sm text-slate-600">{dispute.description}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {dispute.items.map((item) => (
                    <li key={item.id}>
                      {item.orderItem.product.sku} &middot; qty {item.quantity} &middot;{' '}
                      {item.reason.replaceAll('_', ' ')}
                      {item.photoUrls.length > 0 && ` · ${item.photoUrls.length} photo(s)`}
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <ResolveDisputeButtons disputeId={dispute.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Goods Receipt (${receivableLines.length} line(s) pending)`}>
        {receivableLines.length === 0 ? (
          <EmptyState text="Nothing dispatched is awaiting a goods receipt entry." />
        ) : (
          <ul className="space-y-3">
            {receivableLines.map((line) => (
              <li
                key={line.purchaseOrderItemId}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-bold text-slate-900">{line.productName}</p>
                  <p className="text-sm text-slate-500">
                    {line.poNumber} &middot; {line.remaining} remaining to receive
                  </p>
                </div>
                <GoodsReceiptForm purchaseOrderItemId={line.purchaseOrderItemId} remaining={line.remaining} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Record a Vendor Bill">
        <VendorBillForm purchaseOrders={billablePOs} />
      </Section>

      <Section title={`Vendor Bills Needing Review (${vendorBills.length})`}>
        {vendorBills.length === 0 ? (
          <EmptyState text="No vendor bills pending 3-way match." />
        ) : (
          <ul className="space-y-3">
            {vendorBills.map((bill) => (
              <li key={bill.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {bill.billNumber} &middot; {bill.vendor.displayName}
                    </p>
                    <p className="text-sm text-slate-500">
                      Against {bill.purchaseOrder.poNumber} &middot; {formatInr(bill.billAmount)}
                    </p>
                    {bill.matchStatus === 'MISMATCHED' && (
                      <p className="mt-1 text-xs font-semibold text-rose-600">{bill.mismatchNotes}</p>
                    )}
                  </div>
                  <RunThreeWayMatchButton vendorBillId={bill.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Payables Ready to Release (${pendingPayables.length})`}>
        {pendingPayables.length === 0 ? (
          <EmptyState text="No matched payables waiting on release." />
        ) : (
          <ul className="space-y-3">
            {pendingPayables.map((payable) => (
              <li key={payable.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">{payable.vendor.displayName}</p>
                    <p className="text-sm text-slate-500">
                      Bill {payable.vendorBill.billNumber} &middot; {formatInr(payable.amount)}
                    </p>
                  </div>
                  <ReleasePayableButton payableId={payable.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Customer Payments Awaiting Verification (${pendingPayments.length})`}>
        {pendingPayments.length === 0 ? (
          <EmptyState text="No payments waiting on finance verification." />
        ) : (
          <ul className="space-y-3">
            {pendingPayments.map((payment) => (
              <li key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {payment.order.orderNumber} &middot; {formatInr(payment.amount)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {payment.mode} &middot; UTR {payment.utrNumber} &middot;{' '}
                      {payment.customer.legalName ?? payment.customer.user.name ?? payment.customer.user.email}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <VerifyPaymentButton paymentId={payment.id} />
                    <RejectPaymentButton paymentId={payment.id} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
      {text}
    </p>
  );
}

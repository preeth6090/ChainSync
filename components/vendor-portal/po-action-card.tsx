'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, IndianRupee, Loader2 } from 'lucide-react';
import { acceptPoAction } from '@/lib/actions/vendor-portal';
import { BottomDrawer } from './bottom-drawer';
import { RespondForm } from './respond-form';
import { DispatchSection } from './dispatch-section';
import { formatInrWhole as formatInr } from '@/lib/format';
import type { PurchaseOrderWithDetails, VendorPortalVendor } from './types';

const AWAITING_RESPONSE_STATUSES = new Set(['APPROVED', 'SENT_TO_VENDOR']);
const DISPATCHABLE_STATUSES = new Set(['ACCEPTED_BY_VENDOR', 'PARTIALLY_RECEIVED']);

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending internal approval',
  APPROVED: 'Awaiting your response',
  SENT_TO_VENDOR: 'Awaiting your response',
  ACCEPTED_BY_VENDOR: 'Accepted — ready to dispatch',
  PRICE_PROPOSED: 'Price proposal sent',
  VENDOR_REJECTED: 'Rejected',
  DISPATCHED: 'Dispatched',
  PARTIALLY_RECEIVED: 'Partially received',
  RECEIVED: 'Received',
  INVOICED: 'Invoiced',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export function PoActionCard({
  token,
  vendor,
  purchaseOrder,
}: {
  token: string;
  vendor: VendorPortalVendor;
  purchaseOrder: PurchaseOrderWithDetails;
}) {
  const router = useRouter();
  const [drawer, setDrawer] = useState<'none' | 'respond'>('none');
  const [respondTab, setRespondTab] = useState<'propose' | 'reject'>('propose');
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const awaitingResponse = AWAITING_RESPONSE_STATUSES.has(purchaseOrder.status);
  const canDispatch = DISPATCHABLE_STATUSES.has(purchaseOrder.status);

  function handleAccept() {
    setAcceptError(null);
    startTransition(async () => {
      try {
        await acceptPoAction(token, purchaseOrder.id);
        router.refresh();
      } catch (e) {
        setAcceptError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50 pb-10">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{vendor.displayName}</p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <h1 className="text-lg font-extrabold text-slate-900">{purchaseOrder.poNumber}</h1>
          <StatusPill status={purchaseOrder.status} />
        </div>
      </header>

      <section className="mx-5 mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Purchase order total</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900">{formatInr(purchaseOrder.totalAmount)}</p>
        <ul className="mt-4 divide-y divide-slate-100">
          {purchaseOrder.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <p className="font-semibold text-slate-800">{item.product.name}</p>
                <p className="text-slate-400">
                  {item.product.sku} &middot; Qty {item.quantity}
                </p>
              </div>
              <p className="font-semibold text-slate-700">{formatInr(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      {awaitingResponse && (
        <section className="mx-5 mt-5 space-y-3">
          {acceptError && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{acceptError}</span>
            </div>
          )}
          <button
            onClick={handleAccept}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            Accept PO at {formatInr(purchaseOrder.totalAmount)}
          </button>
          <button
            onClick={() => {
              setRespondTab('propose');
              setDrawer('respond');
            }}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-base font-bold text-slate-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <IndianRupee size={20} />
            Propose New Price / Reject
          </button>
        </section>
      )}

      {purchaseOrder.status === 'PRICE_PROPOSED' && (
        <section className="mx-5 mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your price proposal has been sent to the buyer. You&apos;ll be notified once they respond.
        </section>
      )}

      {purchaseOrder.status === 'VENDOR_REJECTED' && (
        <section className="mx-5 mt-5 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-600">
          You rejected this purchase order.
        </section>
      )}

      {canDispatch && <DispatchSection token={token} po={purchaseOrder} />}

      <BottomDrawer open={drawer === 'respond'} title="Respond to this PO" onClose={() => setDrawer('none')}>
        <RespondForm
          token={token}
          poId={purchaseOrder.id}
          currentAmount={purchaseOrder.totalAmount}
          tab={respondTab}
          onTabChange={setRespondTab}
          onClose={() => setDrawer('none')}
        />
      </BottomDrawer>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'ACCEPTED_BY_VENDOR' || status === 'DISPATCHED' || status === 'RECEIVED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'VENDOR_REJECTED' || status === 'CANCELLED'
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-amber-50 text-amber-700 border-amber-200';
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}

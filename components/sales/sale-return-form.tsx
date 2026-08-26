'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, Undo2 } from 'lucide-react';
import { DisputeReason } from '@prisma/client';
import { lookupOrderForReturnAction, createSaleReturnAction } from '@/lib/actions/sale-returns';

const REASONS: DisputeReason[] = [
  DisputeReason.DAMAGED,
  DisputeReason.MISSING,
  DisputeReason.WRONG_ITEM,
  DisputeReason.QUALITY_ISSUE,
  DisputeReason.OTHER,
];

interface ReturnableItem {
  orderItemId: string;
  productName: string;
  quantity: number;
  lineTotal: number;
}

export function SaleReturnForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState<{ orderId: string; orderNumber: string; customerName: string; items: ReturnableItem[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<DisputeReason>(DisputeReason.DAMAGED);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        <Undo2 size={14} /> New Sale Return
      </button>
    );
  }

  function lookup() {
    setError(null);
    setSuccess(null);
    setOrder(null);
    if (!orderNumber.trim()) return setError('Enter an order number.');
    startTransition(async () => {
      const result = await lookupOrderForReturnAction(orderNumber);
      if (!result.success) return setError(result.error);
      setOrder(result.data);
      setSelected(new Set());
    });
  }

  function toggle(orderItemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderItemId)) next.delete(orderItemId);
      else next.add(orderItemId);
      return next;
    });
  }

  function submit() {
    setError(null);
    if (!order) return;
    if (selected.size === 0) return setError('Select at least one line item.');

    startTransition(async () => {
      const result = await createSaleReturnAction(order.orderId, [...selected], reason, notes);
      if (!result.success) return setError(result.error);
      setSuccess(`Credit note ${result.data.invoiceNumber} issued.`);
      setOrder(null);
      setOrderNumber('');
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-900">New Sale Return</p>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="Order number (e.g. ORD-2026-00001)"
          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
        <button
          onClick={lookup}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          <Search size={14} /> Find
        </button>
      </div>

      {order && (
        <div className="mt-4">
          <p className="text-xs text-slate-500">
            {order.orderNumber} &middot; {order.customerName}
          </p>
          <div className="mt-2 space-y-1.5">
            {order.items.map((item) => (
              <label key={item.orderItemId} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm">
                <input type="checkbox" checked={selected.has(item.orderItemId)} onChange={() => toggle(item.orderItemId)} />
                <span className="flex-1">
                  {item.productName} &times; {item.quantity}
                </span>
                <span className="font-semibold text-slate-700">₹{item.lineTotal.toLocaleString('en-IN')}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as DisputeReason)}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
            />
          </div>

          <button
            onClick={submit}
            disabled={pending}
            className="mt-3 flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Issue Credit Note
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
      {success && <p className="mt-2 text-xs font-semibold text-emerald-600">{success}</p>}
    </div>
  );
}

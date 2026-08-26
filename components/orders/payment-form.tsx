'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { PaymentMode } from '@prisma/client';
import { submitPaymentAction } from '@/lib/actions/payments';

const MODES: PaymentMode[] = ['NEFT', 'RTGS', 'UPI', 'CASH', 'CHEQUE', 'CARD'];

export function PaymentForm({
  orderId,
  invoiceId,
  amountDue,
}: {
  orderId: string;
  invoiceId: string;
  amountDue: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(amountDue));
  const [mode, setMode] = useState<PaymentMode>('UPI');
  const [utr, setUtr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return setError('Enter a valid amount.');
    if (!utr.trim()) return setError('UTR / reference number is required.');

    startTransition(async () => {
      try {
        await submitPaymentAction(orderId, parsed, mode, utr, invoiceId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not submit your payment.');
      }
    });
  }

  return (
    <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Submit payment reference</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-600">Amount paid (Rs.)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMode)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-600">UTR / Transaction reference</label>
        <input
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="e.g. UTR12345678"
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      <button
        onClick={submit}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        Submit for verification
      </button>
    </div>
  );
}

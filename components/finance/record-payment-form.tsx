'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, IndianRupee, X } from 'lucide-react';
import { PaymentMode } from '@prisma/client';
import { recordPaymentAction } from '@/lib/actions/payments';

const MODES: PaymentMode[] = [PaymentMode.CASH, PaymentMode.UPI, PaymentMode.NEFT, PaymentMode.RTGS, PaymentMode.CHEQUE, PaymentMode.CARD];

export function RecordPaymentForm({
  orderId,
  invoiceId,
  suggestedAmount,
}: {
  orderId: string;
  invoiceId: string;
  suggestedAmount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(suggestedAmount));
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
      >
        Record payment
      </button>
    );
  }

  function submit() {
    setError(null);
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return setError('Enter a valid amount.');
    if (!reference.trim()) return setError('Enter a reference number.');

    startTransition(async () => {
      const result = await recordPaymentAction(orderId, numericAmount, mode, reference, invoiceId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
      <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5">
        <IndianRupee size={12} className="text-slate-400" />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-20 py-1 text-xs outline-none"
          placeholder="Amount"
        />
      </div>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as PaymentMode)}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
      >
        {MODES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Ref no."
        className="w-24 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
      />
      <button
        onClick={submit}
        disabled={pending}
        className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
      </button>
      <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
      {error && <p className="w-full text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

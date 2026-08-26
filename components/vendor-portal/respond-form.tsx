'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { proposeNewPriceAction, rejectPoAction } from '@/lib/actions/vendor-portal';

export function RespondForm({
  token,
  poId,
  currentAmount,
  tab,
  onTabChange,
  onClose,
}: {
  token: string;
  poId: string;
  currentAmount: unknown;
  tab: 'propose' | 'reject';
  onTabChange: (tab: 'propose' | 'reject') => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(currentAmount));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitPropose() {
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    startTransition(async () => {
      try {
        await proposeNewPriceAction(token, poId, parsed, reason);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not send your proposal.');
      }
    });
  }

  function submitReject() {
    setError(null);
    if (!reason.trim()) {
      setError('Please tell the buyer why you are rejecting this PO.');
      return;
    }
    startTransition(async () => {
      try {
        await rejectPoAction(token, poId, reason);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reject the PO.');
      }
    });
  }

  return (
    <div>
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(['propose', 'reject'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setError(null);
              onTabChange(t);
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
            }`}
          >
            {t === 'propose' ? 'Propose New Price' : 'Reject PO'}
          </button>
        ))}
      </div>

      {tab === 'propose' ? (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Your proposed amount (Rs.)</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. raw material cost increase"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button
            onClick={submitPropose}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/25 disabled:opacity-60"
          >
            {pending && <Loader2 size={18} className="animate-spin" />}
            Send Proposal — Alerts Buyer
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Reason for rejecting</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Required — let the buyer know why"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button
            onClick={submitReject}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-rose-600/25 disabled:opacity-60"
          >
            {pending && <Loader2 size={18} className="animate-spin" />}
            <XCircle size={18} />
            Reject This PO
          </button>
        </div>
      )}
    </div>
  );
}

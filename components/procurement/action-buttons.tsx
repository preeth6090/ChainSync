'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { submitPoForApprovalAction, approvePoAction, rejectPoAction, runThreeWayMatchAction } from '@/lib/actions/procurement';
import { resolveMoqConflictAction } from '@/lib/actions/moq-conflict';
import { markShipmentDeliveredAction, resolveDisputeAction } from '@/lib/actions/dispute';
import { verifyPaymentAction, rejectPaymentAction } from '@/lib/actions/payments';
import type { DisputeResolution } from '@/lib/services/dispute';

// Every button here follows the same shape: fire a Server Action, router.refresh() on
// success so the Server Component parent re-fetches, show an inline error on failure. Kept
// as small, single-purpose client islands so the surrounding dashboard page can stay a
// Server Component that formats Decimal values into plain text server-side, rather than
// needing to pass Decimal-bearing rows down as props.

export function ApprovePoButton({ poId, disabled }: { poId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await approvePoAction(poId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not approve.');
            }
          })
        }
        disabled={disabled || pending}
        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Approve'}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function RejectPoButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600"
      >
        Reject
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-rose-400 focus:outline-none"
      />
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            if (!reason.trim()) return setError('Reason required.');
            try {
              await rejectPoAction(poId, reason);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not reject.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
      </button>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function MoqConflictActions({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve(resolution: 'FORCE_ROUTE' | 'CANCEL') {
    setError(null);
    startTransition(async () => {
      try {
        await resolveMoqConflictAction(alertId, resolution);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not resolve.');
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => resolve('FORCE_ROUTE')}
          disabled={pending}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : 'Force route (vendor agreed)'}
        </button>
        <button
          onClick={() => resolve('CANCEL')}
          disabled={pending}
          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 disabled:opacity-40"
        >
          Cancel line
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function RunThreeWayMatchButton({ vendorBillId }: { vendorBillId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await runThreeWayMatchAction(vendorBillId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Match failed.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Run 3-way match'}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export { ReleasePayableButton } from '@/components/finance/release-payable-button';

export function SubmitPoButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await submitPoForApprovalAction(poId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not submit.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Submit for approval'}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function MarkDeliveredButton({ shipmentId }: { shipmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await markShipmentDeliveredAction(shipmentId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not mark delivered.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Mark delivered'}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function ResolveDisputeButtons({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  function resolve(resolution: DisputeResolution) {
    setError(null);
    startTransition(async () => {
      try {
        await resolveDisputeAction(disputeId, resolution, note || undefined);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not resolve.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resolution note (optional)"
        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => resolve('REFUND')}
          disabled={pending}
          className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          Refund
        </button>
        <button
          onClick={() => resolve('REPLACEMENT')}
          disabled={pending}
          className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          Replace
        </button>
        <button
          onClick={() => resolve('REJECTED')}
          disabled={pending}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-40"
        >
          Reject dispute
        </button>
        {pending && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </div>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function VerifyPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await verifyPaymentAction(paymentId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not verify.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Verify & close loop'}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

export function RejectPaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600"
      >
        Reject
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason"
        className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-rose-400 focus:outline-none"
      />
      <button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            if (!reason.trim()) return setError('Reason required.');
            try {
              await rejectPaymentAction(paymentId, reason);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not reject.');
            }
          })
        }
        disabled={pending}
        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
      </button>
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

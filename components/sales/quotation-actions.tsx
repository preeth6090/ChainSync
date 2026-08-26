'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { QuotationStatus } from '@prisma/client';
import { setQuotationStatusAction, convertQuotationAction } from '@/lib/actions/quotations';

export function QuotationActions({ quotationId, status }: { quotationId: string; status: QuotationStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(next: QuotationStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setQuotationStatusAction(quotationId, next);
      if (!result.success) return setError(result.error);
      router.refresh();
    });
  }

  function convert() {
    setError(null);
    startTransition(async () => {
      const result = await convertQuotationAction(quotationId);
      if (!result.success) return setError(result.error);
      router.push(`/orders/${result.data.orderId}`);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {status === QuotationStatus.DRAFT && (
          <button
            onClick={() => setStatus(QuotationStatus.SENT)}
            disabled={pending}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Mark Sent
          </button>
        )}
        {(status === QuotationStatus.SENT || status === QuotationStatus.DRAFT) && (
          <>
            <button
              onClick={() => setStatus(QuotationStatus.ACCEPTED)}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              Accept
            </button>
            <button
              onClick={() => setStatus(QuotationStatus.REJECTED)}
              disabled={pending}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
            >
              Reject
            </button>
          </>
        )}
        {status === QuotationStatus.ACCEPTED && (
          <button
            onClick={convert}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
          >
            {pending && <Loader2 size={12} className="animate-spin" />}
            Convert to Order
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

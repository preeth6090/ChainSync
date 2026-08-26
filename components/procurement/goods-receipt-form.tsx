'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { recordGoodsReceiptAction } from '@/lib/actions/procurement';

export function GoodsReceiptForm({ purchaseOrderItemId, remaining }: { purchaseOrderItemId: string; remaining: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(remaining);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <p className="text-xs font-semibold text-emerald-600">Recorded.</p>;

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={remaining}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, Number(e.target.value))))}
          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
        <button
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await recordGoodsReceiptAction(purchaseOrderItemId, quantity);
                setDone(true);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not record receipt.');
              }
            })
          }
          disabled={pending}
          className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : 'Record'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

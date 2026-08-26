'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { generateInvoiceForOrderAction } from '@/lib/actions/billing';

export function GenerateInvoiceButton({ orderId }: { orderId: string }) {
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
              await generateInvoiceForOrderAction(orderId);
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not generate invoice.');
            }
          })
        }
        disabled={pending}
        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        Generate invoice now
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

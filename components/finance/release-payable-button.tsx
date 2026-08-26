'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { releaseVendorPayableAction } from '@/lib/actions/procurement';

export function ReleasePayableButton({ payableId }: { payableId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await releaseVendorPayableAction(payableId);
        router.refresh();
      } catch {
        setError('Could not release payment.');
      }
    });
  }

  return (
    <div>
      <button
        onClick={submit}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending && <Loader2 size={12} className="animate-spin" />}
        Mark Paid
      </button>
      {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

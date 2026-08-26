'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, FilePlus2 } from 'lucide-react';
import { createQuotationAction } from '@/lib/actions/quotations';

export interface CustomerOption {
  id: string;
  name: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
}

interface LineDraft {
  productId: string;
  quantity: number;
}

export function CreateQuotationForm({ customers, products }: { customers: CustomerOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ productId: products[0]?.id ?? '', quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
      >
        <FilePlus2 size={14} /> New Quotation
      </button>
    );
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const total = lines.reduce((sum, l) => sum + (productMap.get(l.productId)?.unitPrice ?? 0) * l.quantity, 0);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function submit() {
    setError(null);
    if (!customerId) return setError('Choose a customer.');
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (validLines.length === 0) return setError('Add at least one line item.');

    startTransition(async () => {
      const result = await createQuotationAction(customerId, validLines, validUntil || undefined, notes || undefined);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setLines([{ productId: products[0]?.id ?? '', quantity: 1 }]);
      setNotes('');
      setValidUntil('');
      router.refresh();
    });
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-900">New Quotation</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
        />
      </div>

      <div className="mt-3 space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={line.productId}
              onChange={(e) => updateLine(i, { productId: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })}
              className="w-20 rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
            />
            <button
              onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={lines.length === 1}
              className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setLines((prev) => [...prev, { productId: products[0]?.id ?? '', quantity: 1 }])}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600"
        >
          <Plus size={14} /> Add line
        </button>
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="mt-3 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
      />

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">
          Est. total: <span className="text-slate-900">₹{total.toLocaleString('en-IN')}</span>
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(false)} className="text-xs font-bold text-slate-500">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Save Quotation
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { recordVendorBillAction } from '@/lib/actions/procurement';

interface PoItemOption {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface BillablePo {
  id: string;
  poNumber: string;
  items: PoItemOption[];
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export function VendorBillForm({ purchaseOrders }: { purchaseOrders: BillablePo[] }) {
  const router = useRouter();
  const [selectedPoId, setSelectedPoId] = useState(purchaseOrders[0]?.id ?? '');
  const [billNumber, setBillNumber] = useState('');
  const [lineValues, setLineValues] = useState<Record<string, { quantity: number; price: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPo = purchaseOrders.find((po) => po.id === selectedPoId);

  function valueFor(item: PoItemOption) {
    return lineValues[item.id] ?? { quantity: item.quantity, price: item.unitPrice };
  }

  const billAmount = useMemo(() => {
    if (!selectedPo) return 0;
    return selectedPo.items.reduce((sum, item) => {
      const v = valueFor(item);
      return sum + v.quantity * v.price;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPo, lineValues]);

  function submit() {
    setError(null);
    if (!selectedPo) return setError('Select a purchase order.');
    if (!billNumber.trim()) return setError('Bill number is required.');

    const lines = selectedPo.items.map((item) => {
      const v = valueFor(item);
      return { purchaseOrderItemId: item.id, invoicedQuantity: v.quantity, invoicedPrice: v.price };
    });

    startTransition(async () => {
      try {
        await recordVendorBillAction(selectedPo.id, billNumber, billAmount, lines);
        router.refresh();
        setBillNumber('');
        setLineValues({});
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not record vendor bill.');
      }
    });
  }

  if (purchaseOrders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
        No dispatched purchase orders are awaiting a vendor bill.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <label className="text-xs font-bold text-slate-600">Purchase order</label>
        <select
          value={selectedPoId}
          onChange={(e) => {
            setSelectedPoId(e.target.value);
            setLineValues({});
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        >
          {purchaseOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.poNumber}
            </option>
          ))}
        </select>
      </div>

      {selectedPo && (
        <ul className="space-y-2">
          {selectedPo.items.map((item) => {
            const v = valueFor(item);
            return (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex-1">{item.productName}</span>
                <input
                  type="number"
                  min={0}
                  value={v.quantity}
                  onChange={(e) =>
                    setLineValues((prev) => ({ ...prev, [item.id]: { ...v, quantity: Number(e.target.value) } }))
                  }
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  aria-label="Invoiced quantity"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={v.price}
                  onChange={(e) =>
                    setLineValues((prev) => ({ ...prev, [item.id]: { ...v, price: Number(e.target.value) } }))
                  }
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  aria-label="Invoiced price"
                />
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <label className="text-xs font-bold text-slate-600">Bill number</label>
        <input
          value={billNumber}
          onChange={(e) => setBillNumber(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
      </div>

      <p className="text-xs font-semibold text-slate-500">Total: {inr.format(billAmount)}</p>

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Record vendor bill'}
      </button>
    </div>
  );
}

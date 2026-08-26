'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingCart } from 'lucide-react';
import { addToCartAction } from '@/lib/actions/orders';
import { addToCart } from '@/lib/cart-client';

export function AddToCartButton({
  productId,
  name,
  sku,
  unitPrice,
  minCustomerMoq,
}: {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  minCustomerMoq: number;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(minCustomerMoq);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function submit() {
    setError(null);
    setAdded(false);
    startTransition(async () => {
      // Places the 15-minute warehouse hold (for WAREHOUSE_ONLY SKUs) server-side, then
      // mirrors the line into the client-side cart used at checkout.
      const result = await addToCartAction(productId, quantity);
      if (!result.success) {
        setError(result.error);
        return;
      }
      addToCart({ productId, name, sku, unitPrice, quantity });
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={minCustomerMoq}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(minCustomerMoq, Number(e.target.value)))}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
          Add to cart
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
      {added && <p className="mt-1 text-xs font-semibold text-emerald-600">Added to cart.</p>}
    </div>
  );
}

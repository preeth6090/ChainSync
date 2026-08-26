'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { readCart, writeCart, clearCart, type CartLine } from '@/lib/cart-client';
import { checkoutOrderAction } from '@/lib/actions/orders';
import { getMyAddressesAction, addAddressAction, type NewAddressInput } from '@/lib/actions/addresses';

type AddressOption = Awaited<ReturnType<typeof getMyAddressesAction>>[number];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

const EMPTY_ADDRESS: NewAddressInput = { line1: '', line2: '', city: '', state: '', stateCode: '', pincode: '' };

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [addresses, setAddresses] = useState<AddressOption[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<NewAddressInput>(EMPTY_ADDRESS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCart(readCart());
    getMyAddressesAction()
      .then((list) => {
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        if (preferred) setSelectedAddressId(preferred.id);
      })
      .catch(() => setError('Could not load your saved addresses.'))
      .finally(() => setLoaded(true));
  }, []);

  function updateQuantity(productId: string, quantity: number) {
    const next = cart.map((l) => (l.productId === productId ? { ...l, quantity: Math.max(1, quantity) } : l));
    setCart(next);
    writeCart(next);
  }

  function removeLine(productId: string) {
    const next = cart.filter((l) => l.productId !== productId);
    setCart(next);
    writeCart(next);
  }

  const total = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  function submitAddress() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await addAddressAction(newAddress);
        const list = await getMyAddressesAction();
        setAddresses(list);
        setSelectedAddressId(id);
        setShowAddressForm(false);
        setNewAddress(EMPTY_ADDRESS);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save address.');
      }
    });
  }

  function placeOrder() {
    setError(null);
    if (cart.length === 0) return setError('Your cart is empty.');
    if (!selectedAddressId) return setError('Choose a shipping address.');

    startTransition(async () => {
      const result = await checkoutOrderAction(
        selectedAddressId,
        cart.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      clearCart();
      setCart([]);
      router.push(`/orders/${result.data.id}`);
    });
  }

  if (!loaded) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 pb-24">
      <h1 className="text-2xl font-extrabold text-slate-900">Your Cart</h1>

      {cart.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          Your cart is empty. Visit the catalog to add items.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {cart.map((line) => (
            <li
              key={line.productId}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-bold text-slate-900">{line.name}</p>
                <p className="text-xs text-slate-400">
                  {line.sku} &middot; {inr.format(line.unitPrice)} each
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateQuantity(line.productId, Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <button onClick={() => removeLine(line.productId)} className="text-slate-400 hover:text-rose-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {cart.length > 0 && (
        <>
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Shipping address</p>
            {addresses.length > 0 && (
              <div className="mt-2 space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === a.id}
                      onChange={() => setSelectedAddressId(a.id)}
                      className="mt-1"
                    />
                    <span>
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} - {a.pincode}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {!showAddressForm ? (
              <button onClick={() => setShowAddressForm(true)} className="mt-3 text-xs font-bold text-indigo-600">
                + Add a new address
              </button>
            ) : (
              <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                <input
                  placeholder="Address line 1"
                  value={newAddress.line1}
                  onChange={(e) => setNewAddress((p) => ({ ...p, line1: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <input
                  placeholder="Address line 2 (optional)"
                  value={newAddress.line2}
                  onChange={(e) => setNewAddress((p) => ({ ...p, line2: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Pincode"
                    value={newAddress.pincode}
                    onChange={(e) => setNewAddress((p) => ({ ...p, pincode: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress((p) => ({ ...p, state: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="GST state code (e.g. 27)"
                    value={newAddress.stateCode}
                    onChange={(e) => setNewAddress((p) => ({ ...p, stateCode: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  onClick={submitAddress}
                  disabled={pending}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : 'Save address'}
                </button>
              </div>
            )}
          </section>

          <section className="mt-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total (before tax)</p>
              <p className="text-2xl font-extrabold text-slate-900">{inr.format(total)}</p>
            </div>
            <button
              onClick={placeOrder}
              disabled={pending}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              {pending && <Loader2 size={16} className="animate-spin" />}
              Place Order
            </button>
          </section>
        </>
      )}

      {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
    </main>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Link as LinkIcon, Loader2, Package, Truck } from 'lucide-react';
import type { DispatchType } from '@prisma/client';
import { dispatchShipmentAction, uploadDispatchProofAction } from '@/lib/actions/vendor-portal';
import type { PurchaseOrderItemWithProduct } from './types';

interface RemainingLine {
  item: PurchaseOrderItemWithProduct;
  remaining: number;
}

export function DispatchForm({
  token,
  poId,
  remainingByItem,
  onDispatched,
}: {
  token: string;
  poId: string;
  remainingByItem: RemainingLine[];
  onDispatched: () => void;
}) {
  const router = useRouter();
  const [dispatchType, setDispatchType] = useState<DispatchType>('THIRD_PARTY_LOGISTICS');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [trackingLink, setTrackingLink] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(remainingByItem.map((r) => [r.item.id, r.remaining]))
  );
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const items = remainingByItem
      .map((r) => ({ purchaseOrderItemId: r.item.id, quantity: quantities[r.item.id] ?? 0 }))
      .filter((line) => line.quantity > 0);

    if (items.length === 0) {
      setError('Select at least one item to ship.');
      return;
    }
    if (dispatchType === 'VENDOR_DELIVERY' && !vehicleNumber.trim()) {
      setError('Vehicle number is required for vendor delivery.');
      return;
    }

    startTransition(async () => {
      try {
        const shipment = await dispatchShipmentAction(token, poId, {
          dispatchType,
          vehicleNumber: vehicleNumber || undefined,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          trackingLink: trackingLink || undefined,
          items,
        });

        if (photo) {
          const formData = new FormData();
          formData.set('file', photo);
          await uploadDispatchProofAction(token, shipment.id, 'VEHICLE_PHOTO', formData);
        }

        router.refresh();
        onDispatched();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not dispatch this shipment.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-slate-700">Dispatch method</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setDispatchType('THIRD_PARTY_LOGISTICS')}
            className={`rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition ${
              dispatchType === 'THIRD_PARTY_LOGISTICS' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <Package size={18} className="mx-auto mb-1" />
            3PL Dispatch
          </button>
          <button
            onClick={() => setDispatchType('VENDOR_DELIVERY')}
            className={`rounded-2xl border-2 px-4 py-3.5 text-sm font-bold transition ${
              dispatchType === 'VENDOR_DELIVERY' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'
            }`}
          >
            <Truck size={18} className="mx-auto mb-1" />
            Vendor Delivery
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">Items in this shipment</label>
        <ul className="mt-2 space-y-2">
          {remainingByItem.map(({ item, remaining }) => (
            <li key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
                <p className="text-xs text-slate-400">{remaining} remaining</p>
              </div>
              <input
                type="number"
                min={0}
                max={remaining}
                value={quantities[item.id] ?? 0}
                onChange={(e) =>
                  setQuantities((prev) => ({ ...prev, [item.id]: Math.max(0, Math.min(remaining, Number(e.target.value))) }))
                }
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm font-bold"
              />
            </li>
          ))}
        </ul>
      </div>

      {dispatchType === 'VENDOR_DELIVERY' && (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Vehicle number</label>
            <input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. MH12AB1234"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Driver name</label>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Driver phone</label>
              <input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <LinkIcon size={13} /> Porter tracking link or WhatsApp live location
            </label>
            <input
              value={trackingLink}
              onChange={(e) => setTrackingLink(e.target.value)}
              placeholder="Paste link here"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-semibold text-slate-700">Proof of dispatch (optional)</label>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-6 text-center text-sm font-semibold text-slate-500 hover:border-indigo-300 hover:text-indigo-600">
          <Camera size={20} />
          {photo ? photo.name : 'Snap or upload vehicle / E-way bill photo'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-600/25 disabled:opacity-60"
      >
        {pending && <Loader2 size={18} className="animate-spin" />}
        Confirm Dispatch
      </button>
    </div>
  );
}

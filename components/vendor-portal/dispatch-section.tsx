'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, MapPin, Plus, Truck } from 'lucide-react';
import { BottomDrawer } from './bottom-drawer';
import { DispatchForm } from './dispatch-form';
import type { PurchaseOrderWithDetails } from './types';

export function DispatchSection({ token, po }: { token: string; po: PurchaseOrderWithDetails }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const remainingByItem = useMemo(() => {
    const shipped = new Map<string, number>();
    for (const shipment of po.shipments) {
      for (const si of shipment.items) {
        if (!si.purchaseOrderItemId) continue;
        shipped.set(si.purchaseOrderItemId, (shipped.get(si.purchaseOrderItemId) ?? 0) + si.quantity);
      }
    }
    return po.items
      .map((item) => ({ item, remaining: item.quantity - (shipped.get(item.id) ?? 0) }))
      .filter((r) => r.remaining > 0);
  }, [po]);

  return (
    <section className="mx-5 mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
          <Truck size={16} /> Shipments
        </h2>
        {remainingByItem.length > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700"
          >
            <Plus size={14} /> Add shipment
          </button>
        )}
      </div>

      {po.shipments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-400">
          No shipments dispatched yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {po.shipments.map((shipment) => (
            <li key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">{shipment.shipmentNumber}</p>
                <span className="text-xs font-semibold text-slate-400">
                  {shipment.dispatchType === 'THIRD_PARTY_LOGISTICS' ? '3PL' : 'Vendor delivery'}
                </span>
              </div>
              {shipment.vehicleNumber && <p className="mt-1 text-xs text-slate-500">Vehicle {shipment.vehicleNumber}</p>}
              {shipment.trackingLink && (
                <a
                  href={shipment.trackingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-indigo-600"
                >
                  <MapPin size={14} /> Track shipment <ChevronRight size={14} />
                </a>
              )}
              {shipment.proofs.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">{shipment.proofs.length} proof photo(s) uploaded</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <BottomDrawer open={drawerOpen} title="Dispatch shipment" onClose={() => setDrawerOpen(false)}>
        <DispatchForm token={token} poId={po.id} remainingByItem={remainingByItem} onDispatched={() => setDrawerOpen(false)} />
      </BottomDrawer>
    </section>
  );
}

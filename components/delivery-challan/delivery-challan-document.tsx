'use client';

import { Printer } from 'lucide-react';
import { formatDate } from '@/lib/format';

export interface ChallanCompany {
  legalName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  pincode: string;
  gstin: string;
}

export interface ChallanData {
  shipmentNumber: string;
  dispatchType: string;
  status: string;
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  dispatchedAt: string | null;
  createdAt: string;
  orderNumber: string;
  customerName: string;
  shippingAddress: { line1: string; line2?: string | null; city: string; state: string; pincode: string };
  items: { id: string; productName: string; sku: string; unit: string; quantity: number }[];
}

export function DeliveryChallanDocument({ company, shipment }: { company: ChallanCompany; shipment: ChallanData }) {
  const address = shipment.shippingAddress;

  return (
    <div className="min-h-dvh bg-slate-100 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{'@page { size: A4; margin: 0; }'}</style>

      <div className="mx-auto mb-6 flex w-full max-w-3xl justify-end px-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      <div
        id="delivery-challan"
        className="mx-auto w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-lg print:m-0 print:p-[12mm] print:shadow-none"
      >
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">{company.legalName}</h1>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {company.addressLine1}
              {company.addressLine2 ? `, ${company.addressLine2}` : ''}, {company.city} - {company.pincode}
            </p>
            <p className="text-[10px] text-slate-600">GSTIN: {company.gstin}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-extrabold uppercase tracking-wide">Delivery Challan</p>
            <p className="mt-1 text-[10px] text-slate-500">Not a tax invoice — goods dispatch record only</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Ship to</p>
            <p className="mt-1 font-bold">{shipment.customerName}</p>
            <p className="text-slate-600">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} - {address.pincode}
            </p>
          </div>
          <div className="text-right">
            <dl className="space-y-0.5">
              <Row label="Challan No." value={shipment.shipmentNumber} />
              <Row label="Date" value={formatDate(shipment.dispatchedAt ?? shipment.createdAt)} />
              <Row label="Order No." value={shipment.orderNumber} />
              <Row label="Dispatch Mode" value={shipment.dispatchType.replace(/_/g, ' ')} />
            </dl>
          </div>
        </div>

        {(shipment.vehicleNumber || shipment.driverName) && (
          <div className="mt-3 grid grid-cols-2 gap-6 rounded border border-slate-200 bg-slate-50 p-2">
            {shipment.vehicleNumber && <Row label="Vehicle No." value={shipment.vehicleNumber} />}
            {shipment.driverName && <Row label="Driver" value={`${shipment.driverName}${shipment.driverPhone ? ` (${shipment.driverPhone})` : ''}`} />}
          </div>
        )}

        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-y-2 border-slate-900 bg-slate-50 text-left">
              <th className="w-6 py-1.5 pl-1 font-bold">#</th>
              <th className="py-1.5 font-bold">Description</th>
              <th className="py-1.5 font-bold">SKU</th>
              <th className="py-1.5 text-right font-bold">Qty</th>
              <th className="py-1.5 pr-1 text-right font-bold">Unit</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-1.5 pl-1">{i + 1}</td>
                <td className="py-1.5">{item.productName}</td>
                <td className="py-1.5 text-slate-500">{item.sku}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 pr-1 text-right">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-6 text-[10px]">
          <div className="border-t border-slate-400 pt-2">Dispatched by (signature)</div>
          <div className="border-t border-slate-400 pt-2">Received by (signature)</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

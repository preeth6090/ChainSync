'use client';

import { Printer } from 'lucide-react';
import { formatDate } from '@/lib/format';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export interface SaleOrderCompany {
  legalName: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
}

export interface SaleOrderData {
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  customerName: string;
  customerGstin: string | null;
  shippingAddress: { line1: string; line2?: string | null; city: string; state: string; pincode: string };
  items: { id: string; productName: string; sku: string; hsnCode: string; quantity: number; unitPrice: number; gstRate: number; lineTotal: number }[];
}

export function SaleOrderDocument({ company, order }: { company: SaleOrderCompany; order: SaleOrderData }) {
  const address = order.shippingAddress;

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
        id="sale-order"
        className="mx-auto w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-lg print:m-0 print:p-[12mm] print:shadow-none"
      >
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">{company.legalName}</h1>
            <p className="mt-0.5 text-[10px] text-slate-600">
              {company.addressLine1}
              {company.addressLine2 ? `, ${company.addressLine2}` : ''}, {company.city}, {company.state} - {company.pincode}
            </p>
            <p className="text-[10px] text-slate-600">GSTIN: {company.gstin}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-extrabold uppercase tracking-wide">Sale Order</p>
            <p className="mt-1 text-[10px] text-slate-500">Status: {order.status.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bill / Ship to</p>
            <p className="mt-1 font-bold">{order.customerName}</p>
            <p className="text-slate-600">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} - {address.pincode}
            </p>
            {order.customerGstin && <p className="text-slate-600">GSTIN: {order.customerGstin}</p>}
          </div>
          <div className="text-right">
            <dl className="space-y-0.5">
              <Row label="Order No." value={order.orderNumber} />
              <Row label="Order Date" value={formatDate(order.createdAt)} />
            </dl>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-y-2 border-slate-900 bg-slate-50 text-left">
              <th className="w-6 py-1.5 pl-1 font-bold">#</th>
              <th className="py-1.5 font-bold">Description</th>
              <th className="py-1.5 font-bold">HSN</th>
              <th className="py-1.5 text-right font-bold">Qty</th>
              <th className="py-1.5 text-right font-bold">Rate</th>
              <th className="py-1.5 text-right font-bold">GST%</th>
              <th className="py-1.5 pr-1 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-1.5 pl-1">{i + 1}</td>
                <td className="py-1.5">{item.productName}</td>
                <td className="py-1.5 text-slate-500">{item.hsnCode}</td>
                <td className="py-1.5 text-right">{item.quantity}</td>
                <td className="py-1.5 text-right">{inr.format(item.unitPrice)}</td>
                <td className="py-1.5 text-right">{item.gstRate}%</td>
                <td className="py-1.5 pr-1 text-right font-semibold">{inr.format(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <div className="w-56 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{inr.format(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax</span>
              <span>{inr.format(order.taxTotal)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 font-extrabold">
              <span>Total</span>
              <span>{inr.format(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-[10px] text-slate-400">
          This is a sale order confirmation, not a tax invoice. A GST tax invoice is issued once delivery is
          finalized.
        </p>
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

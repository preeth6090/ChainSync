'use client';

import { useState } from 'react';
import { Printer } from 'lucide-react';
import { A4TaxInvoice } from './a4-tax-invoice';
import { ThermalReceipt80mm } from './thermal-receipt';
import type { CompanyLetterheadData, InvoiceDocumentData } from './types';

type PrintFormat = 'A4' | 'THERMAL_80MM';

// @page has no way to scope a rule to a runtime condition, so the page size is switched by
// swapping which <style> tag is mounted for the currently-selected format — the only
// reliable cross-browser way to change paper size/margins dynamically at print time.
const PAGE_STYLE: Record<PrintFormat, string> = {
  A4: '@page { size: A4; margin: 0; }',
  THERMAL_80MM: '@page { size: 80mm auto; margin: 0; }',
};

const FORMAT_LABEL: Record<PrintFormat, string> = {
  A4: 'A4 Tax Invoice',
  THERMAL_80MM: '80mm Thermal',
};

export function InvoiceDocument({
  company,
  invoice,
}: {
  company: CompanyLetterheadData;
  invoice: InvoiceDocumentData;
}) {
  const [format, setFormat] = useState<PrintFormat>('A4');

  return (
    <div className="min-h-dvh bg-slate-100 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{PAGE_STYLE[format]}</style>

      {/* Screen-only controls */}
      <div className="mx-auto mb-6 flex w-full max-w-3xl items-center justify-between px-4 print:hidden">
        <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {(Object.keys(FORMAT_LABEL) as PrintFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                format === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
        >
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Printable document — only the selected format is ever mounted */}
      <div className="shadow-lg print:shadow-none">
        {format === 'A4' ? (
          <A4TaxInvoice company={company} invoice={invoice} />
        ) : (
          <ThermalReceipt80mm company={company} invoice={invoice} />
        )}
      </div>
    </div>
  );
}

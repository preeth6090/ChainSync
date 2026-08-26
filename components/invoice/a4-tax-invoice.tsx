import { formatInr, formatDate, formatNumber } from '@/lib/format';
import { amountInWords } from '@/lib/number-to-words';
import { summarizeByHsn } from './hsn-summary';
import type { CompanyLetterheadData, InvoiceDocumentData } from './types';

const DOC_TITLE: Record<string, string> = {
  TAX_INVOICE: 'Tax Invoice',
  CREDIT_NOTE: 'Credit Note',
  PROFORMA: 'Proforma Invoice',
};

export function A4TaxInvoice({ company, invoice }: { company: CompanyLetterheadData; invoice: InvoiceDocumentData }) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';
  const hsnRows = summarizeByHsn(invoice.items);
  const address = invoice.billingAddressSnapshot;

  return (
    <div
      id="a4-invoice"
      className="mx-auto w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 print:m-0 print:p-[12mm] print:shadow-none"
    >
      {/* Letterhead */}
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
          <p className="text-base font-extrabold uppercase tracking-wide">{DOC_TITLE[invoice.type] ?? invoice.type}</p>
          <p className="mt-1 text-[10px] text-slate-500">Original for Recipient</p>
        </div>
      </div>

      {/* Meta + Bill To */}
      <div className="mt-3 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Billed to</p>
          <p className="mt-1 font-bold">{invoice.customerLegalName}</p>
          <p className="text-slate-600">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} - {address.pincode}
          </p>
          {invoice.customerGstin && <p className="text-slate-600">GSTIN: {invoice.customerGstin}</p>}
          <p className="text-slate-600">Place of Supply: {invoice.placeOfSupplyStateCode}</p>
        </div>
        <div className="text-right">
          <dl className="space-y-0.5">
            <Row label="Invoice No." value={invoice.invoiceNumber} />
            <Row label="Invoice Date" value={formatDate(invoice.issuedAt)} />
            <Row label="Order No." value={invoice.orderNumber} />
            <Row label="Supply Type" value={isIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'} />
          </dl>
        </div>
      </div>

      {/* Line items */}
      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-y-2 border-slate-900 bg-slate-50 text-left">
            <th className="w-6 py-1.5 pl-1 font-bold">#</th>
            <th className="py-1.5 font-bold">Description</th>
            <th className="py-1.5 font-bold">HSN</th>
            <th className="py-1.5 text-right font-bold">Qty</th>
            <th className="py-1.5 text-right font-bold">Rate</th>
            <th className="py-1.5 text-right font-bold">Taxable Val.</th>
            {isIntraState ? (
              <>
                <th className="py-1.5 text-right font-bold">CGST</th>
                <th className="py-1.5 text-right font-bold">SGST</th>
              </>
            ) : (
              <th className="py-1.5 text-right font-bold">IGST</th>
            )}
            <th className="py-1.5 pr-1 text-right font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={item.id} className="border-b border-slate-200">
              <td className="py-1.5 pl-1 text-slate-500">{idx + 1}</td>
              <td className="py-1.5">{item.productName}</td>
              <td className="py-1.5 text-slate-600">{item.hsnCode}</td>
              <td className="py-1.5 text-right">{item.quantity}</td>
              <td className="py-1.5 text-right">{formatNumber(item.unitPrice)}</td>
              <td className="py-1.5 text-right">{formatNumber(item.taxableValue)}</td>
              {isIntraState ? (
                <>
                  <td className="py-1.5 text-right">
                    {formatNumber(item.cgstAmount)} <span className="text-slate-400">({(item.gstRate / 2).toFixed(1)}%)</span>
                  </td>
                  <td className="py-1.5 text-right">
                    {formatNumber(item.sgstAmount)} <span className="text-slate-400">({(item.gstRate / 2).toFixed(1)}%)</span>
                  </td>
                </>
              ) : (
                <td className="py-1.5 text-right">
                  {formatNumber(item.igstAmount)} <span className="text-slate-400">({item.gstRate}%)</span>
                </td>
              )}
              <td className="py-1.5 pr-1 text-right font-semibold">{formatNumber(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-3 flex justify-end">
        <dl className="w-64 space-y-1">
          <Row label="Subtotal" value={formatInr(invoice.subtotal)} />
          {isIntraState ? (
            <>
              <Row label="CGST" value={formatInr(invoice.cgstTotal)} />
              <Row label="SGST" value={formatInr(invoice.sgstTotal)} />
            </>
          ) : (
            <Row label="IGST" value={formatInr(invoice.igstTotal)} />
          )}
          <div className="flex justify-between border-t-2 border-slate-900 pt-1 text-sm font-extrabold">
            <span>Grand Total</span>
            <span>{formatInr(invoice.grandTotal)}</span>
          </div>
        </dl>
      </div>
      <p className="mt-1 text-right text-[10px] italic text-slate-500">{amountInWords(invoice.grandTotal)}</p>

      {/* HSN Summary */}
      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">HSN Summary</p>
        <table className="mt-1 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-y border-slate-300 bg-slate-50 text-left">
              <th className="py-1 pl-1 font-bold">HSN</th>
              <th className="py-1 text-right font-bold">Taxable Value</th>
              {isIntraState ? (
                <>
                  <th className="py-1 text-right font-bold">CGST</th>
                  <th className="py-1 text-right font-bold">SGST</th>
                </>
              ) : (
                <th className="py-1 text-right font-bold">IGST</th>
              )}
              <th className="py-1 pr-1 text-right font-bold">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {hsnRows.map((row) => (
              <tr key={`${row.hsnCode}-${row.gstRate}`} className="border-b border-slate-100">
                <td className="py-1 pl-1">
                  {row.hsnCode} <span className="text-slate-400">({row.gstRate}%)</span>
                </td>
                <td className="py-1 text-right">{formatNumber(row.taxableValue)}</td>
                {isIntraState ? (
                  <>
                    <td className="py-1 text-right">{formatNumber(row.cgstAmount)}</td>
                    <td className="py-1 text-right">{formatNumber(row.sgstAmount)}</td>
                  </>
                ) : (
                  <td className="py-1 text-right">{formatNumber(row.igstAmount)}</td>
                )}
                <td className="py-1 pr-1 text-right">{formatNumber(row.totalTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bank details + signature */}
      <div className="mt-6 flex items-end justify-between border-t border-slate-200 pt-4">
        <div>
          {company.bankName && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Bank Details</p>
              <p className="text-slate-600">
                {company.bankAccountName} &middot; {company.bankName}
              </p>
              <p className="text-slate-600">
                A/c No. {company.bankAccountNo} &middot; IFSC {company.bankIfsc}
              </p>
            </>
          )}
        </div>
        <div className="text-center">
          <p className="mb-8 text-slate-400">For {company.legalName}</p>
          <p className="border-t border-slate-400 pt-1 text-[10px]">Authorized Signatory</p>
        </div>
      </div>

      <p className="mt-6 text-center text-[9px] text-slate-400">
        This is a computer-generated invoice and does not require a physical signature.
      </p>
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

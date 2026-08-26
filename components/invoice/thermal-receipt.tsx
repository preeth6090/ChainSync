import { formatDate, formatPlain } from '@/lib/format';
import type { CompanyLetterheadData, InvoiceDocumentData } from './types';

const DASH = '- '.repeat(20).trim();

// widthMm defaults to 80 but is left adjustable so a 58mm printer profile can reuse this
// same component later — same layout, narrower @page and font size set by the caller.
export function ThermalReceipt80mm({
  company,
  invoice,
  widthMm = 80,
}: {
  company: CompanyLetterheadData;
  invoice: InvoiceDocumentData;
  widthMm?: number;
}) {
  const isIntraState = invoice.supplyType === 'INTRA_STATE';

  return (
    <div
      id="thermal-receipt"
      style={{ width: `${widthMm}mm` }}
      className="mx-auto bg-white p-2 font-mono text-[11px] leading-tight text-black print:p-0"
    >
      <div className="text-center">
        <p className="text-sm font-bold uppercase">{company.legalName}</p>
        <p>{company.addressLine1}</p>
        <p>
          {company.city}, {company.state} - {company.pincode}
        </p>
        <p>GSTIN: {company.gstin}</p>
      </div>

      <p className="my-1.5 text-center">{DASH}</p>

      <div className="flex justify-between">
        <span>Invoice #</span>
        <span>{invoice.invoiceNumber}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{formatDate(invoice.issuedAt)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="shrink-0">Bill to</span>
        <span className="truncate text-right">{invoice.customerLegalName}</span>
      </div>
      {invoice.customerGstin && (
        <div className="flex justify-between">
          <span>GSTIN</span>
          <span>{invoice.customerGstin}</span>
        </div>
      )}

      <p className="my-1.5 text-center">{DASH}</p>

      {invoice.items.map((item) => (
        <div key={item.id} className="mb-1">
          <p className="font-bold">{item.productName}</p>
          <div className="flex justify-between text-[10px]">
            <span>
              {item.quantity} x {formatPlain(item.unitPrice)}
            </span>
            <span>{formatPlain(item.lineTotal)}</span>
          </div>
        </div>
      ))}

      <p className="my-1.5 text-center">{DASH}</p>

      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatPlain(invoice.subtotal)}</span>
      </div>
      {isIntraState ? (
        <>
          <div className="flex justify-between">
            <span>CGST</span>
            <span>{formatPlain(invoice.cgstTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>SGST</span>
            <span>{formatPlain(invoice.sgstTotal)}</span>
          </div>
        </>
      ) : (
        <div className="flex justify-between">
          <span>IGST</span>
          <span>{formatPlain(invoice.igstTotal)}</span>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-dashed border-black pt-1 text-sm font-bold">
        <span>TOTAL</span>
        <span>Rs. {formatPlain(invoice.grandTotal)}</span>
      </div>

      <p className="my-2 text-center">{DASH}</p>
      <p className="text-center">Thank you for your business!</p>
      <p className="text-center text-[9px] text-slate-500">Computer-generated receipt</p>
    </div>
  );
}

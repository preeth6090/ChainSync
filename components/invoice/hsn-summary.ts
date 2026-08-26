import type { InvoiceLineData } from './types';

export interface HsnSummaryRow {
  hsnCode: string;
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
}

// GST returns require an HSN-wise tax summary distinct from the line-item table — several
// line items can share an HSN + rate and must be rolled into a single summary row.
export function summarizeByHsn(items: InvoiceLineData[]): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();

  for (const item of items) {
    const key = `${item.hsnCode}::${item.gstRate}`;
    const row = map.get(key) ?? {
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    };
    row.taxableValue += item.taxableValue;
    row.cgstAmount += item.cgstAmount;
    row.sgstAmount += item.sgstAmount;
    row.igstAmount += item.igstAmount;
    row.totalTax += item.cgstAmount + item.sgstAmount + item.igstAmount;
    map.set(key, row);
  }

  return [...map.values()].sort((a, b) => a.hsnCode.localeCompare(b.hsnCode));
}

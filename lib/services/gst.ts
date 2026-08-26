import { Decimal } from '@prisma/client/runtime/library';
import { SupplyType } from '@prisma/client';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

// The first two digits of a GSTIN are the issuing state's GST state code.
export function gstinStateCode(gstin: string): string {
  return gstin.trim().slice(0, 2);
}

export function determineSupplyType(companyStateCode: string, placeOfSupplyStateCode: string): SupplyType {
  return companyStateCode === placeOfSupplyStateCode ? SupplyType.INTRA_STATE : SupplyType.INTER_STATE;
}

export interface GstLineInput {
  unitPrice: Decimal.Value;
  quantity: number;
  gstRate: Decimal.Value; // e.g. 18 for 18%
  companyStateCode: string;
  placeOfSupplyStateCode: string;
}

export interface GstLineBreakdown {
  supplyType: SupplyType;
  taxableValue: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  taxTotal: Decimal;
  lineTotal: Decimal;
}

// CGST+SGST for intra-state supply, IGST for inter-state — the split hinges entirely on
// comparing the company's GST state code against the customer's place of supply.
export function calculateLineGst(input: GstLineInput): GstLineBreakdown {
  const { unitPrice, quantity, gstRate, companyStateCode, placeOfSupplyStateCode } = input;
  if (quantity <= 0) throw new Error('quantity must be positive');

  const taxableValue = new Decimal(unitPrice).mul(quantity).toDecimalPlaces(2);
  const rate = new Decimal(gstRate);
  const supplyType = determineSupplyType(companyStateCode, placeOfSupplyStateCode);

  let cgstAmount = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (rate.gt(0)) {
    if (supplyType === SupplyType.INTRA_STATE) {
      const halfRate = rate.div(2);
      cgstAmount = taxableValue.mul(halfRate).div(100).toDecimalPlaces(2);
      sgstAmount = taxableValue.mul(halfRate).div(100).toDecimalPlaces(2);
    } else {
      igstAmount = taxableValue.mul(rate).div(100).toDecimalPlaces(2);
    }
  }

  const taxTotal = cgstAmount.plus(sgstAmount).plus(igstAmount);
  const lineTotal = taxableValue.plus(taxTotal);

  return { supplyType, taxableValue, cgstAmount, sgstAmount, igstAmount, taxTotal, lineTotal };
}

export interface InvoiceTotals {
  subtotal: Decimal;
  cgstTotal: Decimal;
  sgstTotal: Decimal;
  igstTotal: Decimal;
  taxTotal: Decimal;
  grandTotal: Decimal;
}

export function summarizeInvoiceTotals(lines: GstLineBreakdown[]): InvoiceTotals {
  const zero = new Decimal(0);
  const totals = lines.reduce(
    (acc, line) => ({
      subtotal: acc.subtotal.plus(line.taxableValue),
      cgstTotal: acc.cgstTotal.plus(line.cgstAmount),
      sgstTotal: acc.sgstTotal.plus(line.sgstAmount),
      igstTotal: acc.igstTotal.plus(line.igstAmount),
      grandTotal: acc.grandTotal.plus(line.lineTotal),
    }),
    { subtotal: zero, cgstTotal: zero, sgstTotal: zero, igstTotal: zero, grandTotal: zero }
  );
  return { ...totals, taxTotal: totals.cgstTotal.plus(totals.sgstTotal).plus(totals.igstTotal) };
}

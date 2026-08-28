import { describe, it, expect } from 'vitest';
import { calculateLineGst, summarizeInvoiceTotals, determineSupplyType, isValidGstin, gstinStateCode } from '@/lib/services/gst';
import { SupplyType } from '@prisma/client';

describe('determineSupplyType', () => {
  it('is INTRA_STATE when company and place-of-supply states match', () => {
    expect(determineSupplyType('27', '27')).toBe(SupplyType.INTRA_STATE);
  });

  it('is INTER_STATE when they differ', () => {
    expect(determineSupplyType('27', '29')).toBe(SupplyType.INTER_STATE);
  });
});

describe('calculateLineGst', () => {
  it('splits into CGST+SGST for intra-state supply', () => {
    const result = calculateLineGst({
      unitPrice: 1000,
      quantity: 2,
      gstRate: 18,
      companyStateCode: '27',
      placeOfSupplyStateCode: '27',
    });
    expect(result.supplyType).toBe(SupplyType.INTRA_STATE);
    expect(result.taxableValue.toNumber()).toBe(2000);
    expect(result.cgstAmount.toNumber()).toBe(180); // 9% of 2000
    expect(result.sgstAmount.toNumber()).toBe(180);
    expect(result.igstAmount.toNumber()).toBe(0);
    expect(result.taxTotal.toNumber()).toBe(360);
    expect(result.lineTotal.toNumber()).toBe(2360);
  });

  it('charges only IGST for inter-state supply', () => {
    const result = calculateLineGst({
      unitPrice: 1000,
      quantity: 2,
      gstRate: 18,
      companyStateCode: '27',
      placeOfSupplyStateCode: '29',
    });
    expect(result.supplyType).toBe(SupplyType.INTER_STATE);
    expect(result.cgstAmount.toNumber()).toBe(0);
    expect(result.sgstAmount.toNumber()).toBe(0);
    expect(result.igstAmount.toNumber()).toBe(360); // 18% of 2000
    expect(result.lineTotal.toNumber()).toBe(2360);
  });

  it('charges no tax at all when gstRate is 0', () => {
    const result = calculateLineGst({
      unitPrice: 500,
      quantity: 1,
      gstRate: 0,
      companyStateCode: '27',
      placeOfSupplyStateCode: '29',
    });
    expect(result.taxTotal.toNumber()).toBe(0);
    expect(result.lineTotal.toNumber()).toBe(500);
  });

  it('rejects non-positive quantity', () => {
    expect(() =>
      calculateLineGst({ unitPrice: 100, quantity: 0, gstRate: 18, companyStateCode: '27', placeOfSupplyStateCode: '27' })
    ).toThrow();
    expect(() =>
      calculateLineGst({ unitPrice: 100, quantity: -1, gstRate: 18, companyStateCode: '27', placeOfSupplyStateCode: '27' })
    ).toThrow();
  });

  it('rounds to 2 decimal places on an odd GST split', () => {
    // 100 * 12% = 12, split 6/6 exactly — pick a case that actually forces rounding
    const result = calculateLineGst({
      unitPrice: 33.33,
      quantity: 1,
      gstRate: 18,
      companyStateCode: '27',
      placeOfSupplyStateCode: '27',
    });
    // 33.33 * 9% = 2.9997 -> rounds to 3.00
    expect(result.cgstAmount.toNumber()).toBe(3);
    expect(result.sgstAmount.toNumber()).toBe(3);
  });
});

describe('summarizeInvoiceTotals', () => {
  it('sums multiple lines correctly, mixing taxed and tax-free items', () => {
    const line1 = calculateLineGst({ unitPrice: 1000, quantity: 1, gstRate: 18, companyStateCode: '27', placeOfSupplyStateCode: '27' });
    const line2 = calculateLineGst({ unitPrice: 500, quantity: 2, gstRate: 0, companyStateCode: '27', placeOfSupplyStateCode: '27' });

    const totals = summarizeInvoiceTotals([line1, line2]);
    expect(totals.subtotal.toNumber()).toBe(2000); // 1000 + 1000
    expect(totals.cgstTotal.toNumber()).toBe(90);
    expect(totals.sgstTotal.toNumber()).toBe(90);
    expect(totals.taxTotal.toNumber()).toBe(180);
    expect(totals.grandTotal.toNumber()).toBe(2180);
  });

  it('returns all zeros for an empty line list', () => {
    const totals = summarizeInvoiceTotals([]);
    expect(totals.subtotal.toNumber()).toBe(0);
    expect(totals.grandTotal.toNumber()).toBe(0);
  });
});

describe('isValidGstin', () => {
  it('accepts a well-formed GSTIN', () => {
    expect(isValidGstin('27AAPFU0939F1ZV')).toBe(true);
  });

  it('rejects an obviously malformed GSTIN', () => {
    expect(isValidGstin('not-a-gstin')).toBe(false);
    expect(isValidGstin('')).toBe(false);
  });
});

describe('gstinStateCode', () => {
  it('extracts the first two digits as the state code', () => {
    expect(gstinStateCode('27AAPFU0939F1ZV')).toBe('27');
    expect(gstinStateCode('29AABCE6720H1ZO')).toBe('29');
  });
});

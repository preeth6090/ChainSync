import { describe, it, expect } from 'vitest';
import { extractBillFields } from '@/lib/services/ocr-extraction';

describe('extractBillFields', () => {
  it('extracts a bill number and grand total from a well-formed bill', () => {
    const text = `
ACME Steel Traders
Invoice No: INV-2026-0047
Date: 12/08/2026

Subtotal: Rs. 6425.00
GST 18%: Rs. 1156.50
Grand Total: Rs. 7581.50
`;
    const result = extractBillFields(text);
    expect(result.billNumber).toBe('INV-2026-0047');
    expect(result.amount).toBe(7581.5);
  });

  it('handles a "Bill #" style header with a rupee symbol and thousands separator', () => {
    const text = `
Sri Ganesh Enterprises
Bill # SGE/445

Total Amount: ₹12,340
`;
    const result = extractBillFields(text);
    expect(result.billNumber).toBe('SGE/445');
    expect(result.amount).toBe(12340);
  });

  it('does not false-positive on the bare word "invoice" in unrelated prose', () => {
    const result = extractBillFields('Just some random text with no invoice info at all.');
    expect(result.billNumber).toBeNull();
    expect(result.amount).toBeNull();
  });

  it('returns null fields for text with no recognizable structure', () => {
    const result = extractBillFields('');
    expect(result.billNumber).toBeNull();
    expect(result.amount).toBeNull();
  });
});

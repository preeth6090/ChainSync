import { describe, it, expect } from 'vitest';
import { amountInWords } from '@/lib/number-to-words';

describe('amountInWords', () => {
  it('handles zero', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });

  it('handles a simple two-digit amount', () => {
    expect(amountInWords(42)).toBe('Rupees Forty Two Only');
  });

  it('handles hundreds', () => {
    expect(amountInWords(105)).toBe('Rupees One Hundred Five Only');
  });

  it('handles thousands', () => {
    expect(amountInWords(1234)).toBe('Rupees One Thousand Two Hundred Thirty Four Only');
  });

  it('handles lakhs (Indian numbering system)', () => {
    expect(amountInWords(250000)).toBe('Rupees Two Lakh Fifty Thousand Only');
  });

  it('handles crores', () => {
    expect(amountInWords(15000000)).toBe('Rupees One Crore Fifty Lakh Only');
  });

  it('includes paise when present', () => {
    expect(amountInWords(99.5)).toBe('Rupees Ninety Nine and Fifty Paise Only');
  });

  it('rounds paise correctly', () => {
    expect(amountInWords(10.999)).toBe('Rupees Eleven Only');
  });
});

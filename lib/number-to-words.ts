const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? ' ' + ONES[ones] : ''}`;
}

function threeDigits(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const hundredsPart = hundreds ? `${ONES[hundreds]} Hundred${rest ? ' ' : ''}` : '';
  return `${hundredsPart}${rest ? twoDigits(rest) : ''}`;
}

// Indian numbering system (crore / lakh / thousand), as used on GST tax invoices' legally
// required "Amount in words" line.
export function amountInWords(value: number): string {
  let rupees = Math.floor(value);
  let paise = Math.round((value - rupees) * 100);
  // Rounding the fractional part can itself round up to 100 (e.g. 10.999 -> floor 10, paise
  // round(99.9) = 100) — without this carry, twoDigits(100) would index past TENS[9] and
  // print "undefined" in the output instead of correctly becoming the next whole rupee.
  if (paise === 100) {
    rupees += 1;
    paise = 0;
  }

  if (rupees === 0 && paise === 0) return 'Rupees Zero Only';

  let n = rupees;
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  let words = parts.length ? `Rupees ${parts.join(' ')}` : 'Rupees Zero';
  if (paise > 0) words += ` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

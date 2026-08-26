const inrCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrCurrencyWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inrNumber = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Full paise precision — for legal documents (invoices, receipts) where the exact amount matters.
export function formatInr(value: unknown): string {
  return inrCurrency.format(Number(value));
}

// Rounded to the nearest rupee — for large summary figures in dashboards/portals.
export function formatInrWhole(value: unknown): string {
  return inrCurrencyWhole.format(Number(value));
}

// Indian digit grouping, no currency symbol — for use inside tables that already label the column.
export function formatNumber(value: unknown): string {
  return inrNumber.format(Number(value));
}

// Plain 2dp, no grouping — for narrow thermal receipt columns where comma grouping wraps awkwardly.
export function formatPlain(value: unknown): string {
  return Number(value).toFixed(2);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

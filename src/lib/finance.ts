export const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const currencyCache = new Map<string, Intl.NumberFormat>();

export function moneyFor(currency = 'IDR') {
  const code = currency.trim().toUpperCase() || 'IDR';
  if (!currencyCache.has(code)) {
    currencyCache.set(code, new Intl.NumberFormat(code === 'IDR' ? 'id-ID' : 'en-US', { style: 'currency', currency: code, minimumFractionDigits: code === 'IDR' ? 0 : undefined, maximumFractionDigits: code === 'BTC' ? 8 : code === 'IDR' ? 0 : 2 }));
  }
  return currencyCache.get(code)!;
}

export function formatMoney(value: number, currency = 'IDR') {
  try { return moneyFor(currency).format(value); } catch { return `${currency.toUpperCase()} ${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)}`; }
}

export function monthBounds(month?: string) {
  const base = month ? new Date(`${month}-01T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { month: start.toISOString().slice(0, 7), start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function pct(value: number) { return `${Math.round(value)}%`; }

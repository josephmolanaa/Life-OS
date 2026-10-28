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

export function validFinanceMonth(value: unknown): string | undefined {
  return typeof value === 'string' && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;
}

export function shiftFinanceMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthBounds(month?: string) {
  const selected = validFinanceMonth(month);
  const base = selected ? new Date(`${selected}-01T12:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { month: localDate(start).slice(0, 7), start: localDate(start), end: localDate(end) };
}

export function pct(value: number) { return `${Math.round(value)}%`; }

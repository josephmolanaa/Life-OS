import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { SUPABASE_URL } from './supabase/constants';
import { monthBounds } from './finance';
import type { BtcDcaLog, Budget, Category, Loan, NetWorthSnapshot, Transaction, Transfer, Wallet } from './types';

function readAuthSession(cookieHeader: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
  const projectRef = new URL(url).hostname.split('.')[0];
  const cookiePrefix = `sb-${projectRef}-auth-token`;
  const chunks = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(`${cookiePrefix}=`) || entry.startsWith(`${cookiePrefix}.`))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => entry.slice(entry.indexOf('=') + 1));
  if (!chunks.length) return null;

  try {
    let value = decodeURIComponent(chunks.join(''));
    if (value.startsWith('base64-')) value = Buffer.from(value.slice(7), 'base64url').toString();
    return JSON.parse(value) as { access_token?: string; refresh_token?: string };
  } catch {
    return null;
  }
}

export async function requireFinanceUser() {
  const supabase = await createClient();
  const cookieHeader = (await headers()).get('cookie') ?? '';
  const session = readAuthSession(cookieHeader);

  if (session?.access_token && session.refresh_token) {
    const { data, error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (!error && data.user) return { supabase, user: data.user };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { supabase, user };

  redirect('/login');
}

function missingSchemaItem(error: { code?: string; message?: string }, name: string) {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error.code ?? '') && (error.message ?? '').includes(name);
}

async function allWalletSourceRows(supabase: Awaited<ReturnType<typeof createClient>>, table: string, userId: string) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await supabase.from(table).select('*').eq('user_id', userId).order('id').range(offset, offset + 999);
    if (result.error) return { data: null, error: result.error };
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) return { data: rows, error: null };
  }
}

/** Read wallet data across the tracked schema (`wallets`) and the legacy view (`wallet_balances`). */
async function loadWalletRows(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const legacy = await allWalletSourceRows(supabase, 'wallet_balances', userId);
  if (!legacy.error) return legacy.data ?? [];
  if (!missingSchemaItem(legacy.error, 'wallet_balances')) throw new Error('Unable to load wallets', { cause: legacy.error });
  const fallback = await allWalletSourceRows(supabase, 'wallets', userId);
  if (fallback.error) throw new Error('Unable to load wallets', { cause: fallback.error });
  const [transactions, transfers] = await Promise.all([
    allWalletSourceRows(supabase, 'transactions', userId),
    allWalletSourceRows(supabase, 'transfers', userId),
  ]);
  if (transactions.error || transfers.error) throw new Error('Unable to load wallet balances', { cause: transactions.error ?? transfers.error });
  const balances = new Map<string, number>((fallback.data ?? []).map((wallet) => [wallet.id, Number(wallet.initial_balance ?? 0)]));
  for (const row of transactions.data ?? []) {
    const current = balances.get(row.wallet_id) ?? 0;
    balances.set(row.wallet_id, current + (row.type === 'income' ? 1 : -1) * Number(row.amount));
  }
  for (const row of transfers.data ?? []) {
    const amount = Number(row.amount);
    balances.set(row.from_wallet_id, (balances.get(row.from_wallet_id) ?? 0) - amount);
    balances.set(row.to_wallet_id, (balances.get(row.to_wallet_id) ?? 0) + amount);
  }
  return (fallback.data ?? []).map((wallet) => ({ ...wallet, balance: balances.get(wallet.id) ?? Number(wallet.initial_balance ?? 0) }));
}

/** Read both BTC column layouts used by deployed and freshly initialized databases. */
async function loadBtcRows(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const legacy = await supabase.from('btc_dca_logs').select('*').eq('user_id', userId).order('buy_date', { ascending: false });
  if (!legacy.error) return legacy.data ?? [];
  if (!missingSchemaItem(legacy.error, 'buy_date')) throw new Error('Unable to load BTC logs', { cause: legacy.error });
  const canonical = await supabase.from('btc_dca_logs').select('*').eq('user_id', userId).order('log_date', { ascending: false });
  if (canonical.error) throw new Error('Unable to load BTC logs', { cause: canonical.error });
  return (canonical.data ?? []).map((row) => ({ ...row, buy_date: row.buy_date ?? row.log_date, exchange: row.exchange ?? null }));
}

export async function listWallets(userId?: string, activeOnly = false) {
  const { supabase, user } = await requireFinanceUser();
  const data = await loadWalletRows(supabase, userId ?? user.id);
  return (activeOnly ? data.filter((wallet) => !wallet.is_archived) : data) as Wallet[];
}

export async function listActiveWallets(userId?: string) {
  return listWallets(userId, true);
}

export async function getWallet(id: string) {
  const { supabase, user } = await requireFinanceUser();
  const rows = await loadWalletRows(supabase, user.id);
  return (rows.find((wallet) => wallet.id === id) ?? null) as Wallet | null;
}

export async function listTransactions(userId?: string) {
  const { supabase, user } = await requireFinanceUser();
  const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId ?? user.id).order('transaction_date', { ascending: false });
  if (error) throw new Error('Unable to load transactions', { cause: error });
  return (data ?? []) as Transaction[];
}

export async function requireFinance(month?: string) {
  const { supabase, user } = await requireFinanceUser();
  const bounds = monthBounds(month);
  const [wallets, categories, transactions, transfers, loans, budgets, btc, netWorth] = await Promise.all([
    loadWalletRows(supabase, user.id),
    supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('name'),
    supabase.from('transactions').select('*, categories(*), wallets(*)').eq('user_id', user.id).gte('transaction_date', bounds.start).lte('transaction_date', bounds.end).order('transaction_date', { ascending: false }),
    supabase.from('transfers').select('*').eq('user_id', user.id).order('transfer_date', { ascending: false }),
    supabase.from('loans').select('*').eq('user_id', user.id).order('loan_date', { ascending: false }),
    supabase.from('budgets').select('*, categories(*)').eq('user_id', user.id).eq('month', `${bounds.month}-01`),
    loadBtcRows(supabase, user.id),
    supabase.from('net_worth_snapshots').select('*').eq('user_id', user.id).order('snapshot_date'),
  ]);
  for (const result of [categories, transactions, transfers, loans, budgets, netWorth]) {
    if (result.error) throw new Error('Unable to load finance data', { cause: result.error });
  }
  return { user, bounds, wallets: wallets as Wallet[], categories: (categories.data ?? []) as Category[], transactions: (transactions.data ?? []) as Transaction[], transfers: (transfers.data ?? []) as Transfer[], loans: (loans.data ?? []) as Loan[], budgets: (budgets.data ?? []) as Budget[], btc: btc as BtcDcaLog[], netWorth: (netWorth.data ?? []) as NetWorthSnapshot[] };
}

export function totals(data: Awaited<ReturnType<typeof requireFinance>>) {
  const income = data.transactions.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0);
  const expense = data.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
  const totalBalance = data.wallets.filter(w => !w.is_archived).reduce((s,w) => s + Number(w.balance ?? w.initial_balance), 0);
  const cashflow = income - expense;
  const savingRate = income > 0 ? cashflow / income * 100 : 0;
  return { income, expense, totalBalance, cashflow, savingRate };
}





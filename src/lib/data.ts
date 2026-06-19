import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { monthBounds } from './finance';
import type { BtcDcaLog, Budget, Category, Loan, NetWorthSnapshot, Transaction, Transfer, Wallet } from './types';

export async function requireFinanceUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

export async function listWallets(userId?: string, activeOnly = false) {
  const { supabase, user } = await requireFinanceUser();
  let query = supabase.from('wallet_balances').select('*').eq('user_id', userId ?? user.id).order('created_at');
  if (activeOnly) query = query.eq('is_archived', false);
  const { data } = await query;
  return (data ?? []) as Wallet[];
}

export async function listActiveWallets(userId?: string) {
  return listWallets(userId, true);
}

export async function getWallet(id: string) {
  const { supabase, user } = await requireFinanceUser();
  const { data, error } = await supabase.from('wallet_balances').select('*').eq('id', id).eq('user_id', user.id).single();
  return error || !data ? null : data as Wallet;
}

export async function listTransactions(userId?: string) {
  const { supabase, user } = await requireFinanceUser();
  const { data } = await supabase.from('transactions').select('*').eq('user_id', userId ?? user.id).order('transaction_date', { ascending: false });
  return (data ?? []) as Transaction[];
}

export async function requireFinance(month?: string) {
  const { supabase, user } = await requireFinanceUser();
  const bounds = monthBounds(month);
  const [wallets, categories, transactions, transfers, loans, budgets, btc, netWorth] = await Promise.all([
    supabase.from('wallet_balances').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('name'),
    supabase.from('transactions').select('*, categories(*), wallets(*)').eq('user_id', user.id).gte('transaction_date', bounds.start).lte('transaction_date', bounds.end).order('transaction_date', { ascending: false }),
    supabase.from('transfers').select('*').eq('user_id', user.id).order('transfer_date', { ascending: false }),
    supabase.from('loans').select('*').eq('user_id', user.id).order('loan_date', { ascending: false }),
    supabase.from('budgets').select('*, categories(*)').eq('user_id', user.id).eq('month', `${bounds.month}-01`),
    supabase.from('btc_dca_logs').select('*').eq('user_id', user.id).order('buy_date', { ascending: false }),
    supabase.from('net_worth_snapshots').select('*').eq('user_id', user.id).order('snapshot_date'),
  ]);
  return { user, bounds, wallets: (wallets.data ?? []) as Wallet[], categories: (categories.data ?? []) as Category[], transactions: (transactions.data ?? []) as Transaction[], transfers: (transfers.data ?? []) as Transfer[], loans: (loans.data ?? []) as Loan[], budgets: (budgets.data ?? []) as Budget[], btc: (btc.data ?? []) as BtcDcaLog[], netWorth: (netWorth.data ?? []) as NetWorthSnapshot[] };
}

export function totals(data: Awaited<ReturnType<typeof requireFinance>>) {
  const income = data.transactions.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0);
  const expense = data.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
  const totalBalance = data.wallets.filter(w => !w.is_archived).reduce((s,w) => s + Number(w.balance ?? w.initial_balance), 0);
  const cashflow = income - expense;
  const savingRate = income > 0 ? cashflow / income * 100 : 0;
  return { income, expense, totalBalance, cashflow, savingRate };
}

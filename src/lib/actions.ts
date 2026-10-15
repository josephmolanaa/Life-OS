'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { WalletKind } from './types';

type TransactionKind = 'income' | 'expense';
type LoanDirectionKind = 'give' | 'get';
type LoanStatusKind = 'open' | 'settled' | 'cancelled';

const transactionTypes = ['income', 'expense'] as const;
const loanDirections = ['give', 'get'] as const;
const loanStatuses = ['open', 'settled', 'cancelled'] as const;
const walletTypes = ['cash', 'bank', 'ewallet', 'crypto'] as const;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return { supabase, userId: user.id };
}

function value(formData: FormData, key: string) { return String(formData.get(key) ?? '').trim(); }

function amount(formData: FormData, key: string) {
  const raw = value(formData, key);
  if (!raw) return 0;
  // AmountInput and native number inputs submit ungrouped decimal values.
  const parsed = Number(raw);
  if (!/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw) || !Number.isFinite(parsed) || parsed > Number.MAX_SAFE_INTEGER || (parsed === 0 && /[1-9]/.test(raw.split(/[eE]/)[0]))) {
    throw new Error(`${key} must be a valid non-negative amount`);
  }
  return parsed;
}

function required(formData: FormData, key: string, label: string) {
  const text = value(formData, key);
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function requiredAmount(formData: FormData, key: string, label: string) {
  const number = amount(formData, key);
  if (number <= 0) throw new Error(`${label} must be greater than 0`);
  return number;
}

function enumValue<T extends readonly string[]>(formData: FormData, key: string, allowed: T, fallback?: T[number]) {
  const text = value(formData, key);
  if (allowed.includes(text)) return text as T[number];
  if (!text && fallback) return fallback;
  throw new Error(`${key} is invalid`);
}

function dateValue(formData: FormData, key: string, fallbackToday = true) {
  const text = value(formData, key);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const parsed = new Date(`${text}T00:00:00Z`);
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text) return text;
  }
  if (!text && fallbackToday) return new Date().toISOString().slice(0, 10);
  throw new Error(`${key} is invalid`);
}

function monthValue(formData: FormData, key: string) {
  const text = value(formData, key);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return `${text}-01`;
  throw new Error('month is invalid');
}

function done(path = '/finance') { revalidatePath('/finance', 'layout'); redirect(path); }

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}

async function checked<T>(path: string, task: () => Promise<T>) {
  try { return await task(); } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error && String(error.digest).startsWith('NEXT_REDIRECT')) throw error;
    fail(path, error);
  }
}

function redirectOnError(path: string, error: { message?: string } | null) {
  if (error) fail(path, error.message ?? 'Database action failed');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = required(formData, 'email', 'Email');
  const password = required(formData, 'password', 'Password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/finance');
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = required(formData, 'email', 'Email');
  const password = required(formData, 'password', 'Password');
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?mode=register&error=${encodeURIComponent(error.message)}`);
  redirect('/finance');
}

export async function signOut() { const supabase = await createClient(); await supabase.auth.signOut(); redirect('/login'); }

export async function seedDefaults() {
  await checked('/finance/settings', async () => {
    const { supabase, userId } = await requireUser();
    const expenses = ['Makan','Transport','Kebutuhan Pokok','Lifestyle','Gym/Health','Education','Family','Subscription','Investment','Other'];
    const incomes = ['Internship Salary','Freelance','Gift','Investment Return','Other'];
    const wallet = await supabase.from('wallets').upsert({ user_id: userId, name: 'Cash / Uang Tunai', type: 'cash', currency: 'IDR' }, { onConflict: 'user_id,name' });
    redirectOnError('/finance/settings', wallet.error);
    const categories = await supabase.from('categories').upsert([
      ...expenses.map((name) => ({ user_id: userId, name, type: 'expense', is_default: true })),
      ...incomes.map((name) => ({ user_id: userId, name, type: 'income', is_default: true }))
    ], { onConflict: 'user_id,name,type' });
    redirectOnError('/finance/settings', categories.error);
  });
  done('/finance/settings');
}

export async function createWallet(formData: FormData) {
  await checked('/finance/wallets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('wallets').insert({ user_id: userId, name: required(formData,'name','Wallet name'), type: enumValue(formData,'type', walletTypes, 'cash') as WalletKind, currency: (value(formData,'currency') || 'IDR').toUpperCase(), initial_balance: amount(formData,'initial_balance') });
    redirectOnError('/finance/wallets', result.error);
  });
  done('/finance/wallets');
}

export async function updateWallet(formData: FormData) {
  await checked('/finance/wallets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('wallets').update({ name: required(formData,'name','Wallet name'), type: enumValue(formData,'type', walletTypes, 'cash') as WalletKind, currency: (value(formData,'currency') || 'IDR').toUpperCase(), initial_balance: amount(formData,'initial_balance') }).eq('id', required(formData,'id','Wallet ID')).eq('user_id', userId);
    redirectOnError('/finance/wallets', result.error);
  });
  done('/finance/wallets');
}

export async function deleteWallet(formData: FormData) {
  await checked('/finance/wallets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('wallets').delete().eq('id', required(formData,'id','Wallet ID')).eq('user_id', userId);
    redirectOnError('/finance/wallets', result.error);
  });
  done('/finance/wallets');
}

export async function archiveWallet(formData: FormData) {
  await checked('/finance/wallets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('wallets').update({ is_archived: true }).eq('id', required(formData,'id','Wallet ID')).eq('user_id', userId);
    redirectOnError('/finance/wallets', result.error);
  });
  done('/finance/wallets');
}

export async function createCategory(formData: FormData) {
  await checked('/finance/settings', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('categories').insert({ user_id: userId, name: required(formData,'name','Category name'), type: enumValue(formData,'type', transactionTypes, 'expense') as TransactionKind, color: value(formData,'color') || '#64748b', icon: value(formData,'icon') || 'circle', is_default: false });
    redirectOnError('/finance/settings', result.error);
  });
  done('/finance/settings');
}

export async function updateCategory(formData: FormData) {
  await checked('/finance/settings', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('categories').update({ name: required(formData,'name','Category name'), type: enumValue(formData,'type', transactionTypes, 'expense') as TransactionKind, color: value(formData,'color') || '#64748b', icon: value(formData,'icon') || 'circle' }).eq('id', required(formData,'id','Category ID')).eq('user_id', userId);
    redirectOnError('/finance/settings', result.error);
  });
  done('/finance/settings');
}

export async function deleteCategory(formData: FormData) {
  await checked('/finance/settings', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('categories').delete().eq('id', required(formData,'id','Category ID')).eq('user_id', userId);
    redirectOnError('/finance/settings', result.error);
  });
  done('/finance/settings');
}

export async function createTransaction(formData: FormData) {
  await checked('/finance/transactions', async () => {
    const { supabase, userId } = await requireUser();
    const type = enumValue(formData,'type', transactionTypes, 'expense') as TransactionKind;
    const result = await supabase.from('transactions').insert({ user_id: userId, wallet_id: required(formData,'wallet_id','Wallet'), category_id: required(formData,'category_id','Category'), type, amount: requiredAmount(formData,'amount','Amount'), transaction_date: dateValue(formData,'date'), note: value(formData,'note') || null });
    redirectOnError('/finance/transactions', result.error);
  });
  done('/finance/transactions');
}

export async function updateTransaction(formData: FormData) {
  await checked('/finance/transactions', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('transactions').update({ wallet_id: required(formData,'wallet_id','Wallet'), category_id: required(formData,'category_id','Category'), type: enumValue(formData,'type', transactionTypes, 'expense') as TransactionKind, amount: requiredAmount(formData,'amount','Amount'), transaction_date: dateValue(formData,'date'), note: value(formData,'note') || null }).eq('id', required(formData,'id','Transaction ID')).eq('user_id', userId);
    redirectOnError('/finance/transactions', result.error);
  });
  done('/finance/transactions');
}

export async function deleteTransaction(formData: FormData) {
  await checked('/finance/transactions', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('transactions').delete().eq('id', required(formData,'id','Transaction ID')).eq('user_id', userId);
    redirectOnError('/finance/transactions', result.error);
  });
  done('/finance/transactions');
}

export async function createTransfer(formData: FormData) {
  await checked('/finance/transactions', async () => {
    const { supabase, userId } = await requireUser();
    const from = required(formData,'from_wallet_id','Source wallet');
    const to = required(formData,'to_wallet_id','Destination wallet');
    if (from === to) throw new Error('Source and destination wallet must be different');
    const result = await supabase.from('transfers').insert({ user_id: userId, from_wallet_id: from, to_wallet_id: to, amount: requiredAmount(formData,'amount','Amount'), transfer_date: dateValue(formData,'date'), note: value(formData,'note') || null });
    redirectOnError('/finance/transactions', result.error);
  });
  done('/finance/transactions');
}

export async function createLoan(formData: FormData) {
  await checked('/finance/loans', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('loans').insert({ user_id: userId, wallet_id: required(formData,'wallet_id','Wallet'), direction: enumValue(formData,'direction', loanDirections, 'give') as LoanDirectionKind, person_name: required(formData,'person_name','Person name'), amount: requiredAmount(formData,'amount','Amount'), loan_date: dateValue(formData,'date'), due_date: value(formData,'due_date') || null, status: 'open', note: value(formData,'note') || null });
    redirectOnError('/finance/loans', result.error);
  });
  done('/finance/loans');
}

export async function updateLoan(formData: FormData) {
  await checked('/finance/loans', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('loans').update({ wallet_id: required(formData,'wallet_id','Wallet'), direction: enumValue(formData,'direction', loanDirections, 'give') as LoanDirectionKind, person_name: required(formData,'person_name','Person name'), amount: requiredAmount(formData,'amount','Amount'), loan_date: dateValue(formData,'date'), due_date: value(formData,'due_date') || null, status: enumValue(formData,'status', loanStatuses, 'open') as LoanStatusKind, note: value(formData,'note') || null }).eq('id', required(formData,'id','Loan ID')).eq('user_id', userId);
    redirectOnError('/finance/loans', result.error);
  });
  done('/finance/loans');
}

export async function deleteLoan(formData: FormData) {
  await checked('/finance/loans', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('loans').delete().eq('id', required(formData,'id','Loan ID')).eq('user_id', userId);
    redirectOnError('/finance/loans', result.error);
  });
  done('/finance/loans');
}

export async function settleLoan(formData: FormData) {
  await checked('/finance/loans', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('loans').update({ status: 'settled' }).eq('id', required(formData,'id','Loan ID')).eq('user_id', userId);
    redirectOnError('/finance/loans', result.error);
  });
  done('/finance/loans');
}

export async function createBudget(formData: FormData) {
  await checked('/finance/budgets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('budgets').upsert({ user_id: userId, category_id: required(formData,'category_id','Category'), month: monthValue(formData,'month'), amount: amount(formData,'amount') }, { onConflict: 'user_id,category_id,month' });
    redirectOnError('/finance/budgets', result.error);
  });
  done('/finance/budgets');
}

export async function deleteBudget(formData: FormData) {
  await checked('/finance/budgets', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('budgets').delete().eq('id', required(formData,'id','Budget ID')).eq('user_id', userId);
    redirectOnError('/finance/budgets', result.error);
  });
  done('/finance/budgets');
}

export async function createBtcLog(formData: FormData) {
  await checked('/finance/btc', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('btc_dca_logs').insert({ user_id: userId, buy_date: dateValue(formData,'date'), fiat_amount: requiredAmount(formData,'fiat_amount','Fiat amount'), btc_amount: requiredAmount(formData,'btc_amount','BTC amount'), fee_amount: amount(formData,'fee_amount'), exchange: value(formData,'exchange') || null, note: value(formData,'note') || null });
    redirectOnError('/finance/btc', result.error);
  });
  done('/finance/btc');
}

export async function updateBtcLog(formData: FormData) {
  await checked('/finance/btc', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('btc_dca_logs').update({ buy_date: dateValue(formData,'date'), fiat_amount: requiredAmount(formData,'fiat_amount','Fiat amount'), btc_amount: requiredAmount(formData,'btc_amount','BTC amount'), fee_amount: amount(formData,'fee_amount'), exchange: value(formData,'exchange') || null, note: value(formData,'note') || null }).eq('id', required(formData,'id','BTC log ID')).eq('user_id', userId);
    redirectOnError('/finance/btc', result.error);
  });
  done('/finance/btc');
}

export async function deleteBtcLog(formData: FormData) {
  await checked('/finance/btc', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('btc_dca_logs').delete().eq('id', required(formData,'id','BTC log ID')).eq('user_id', userId);
    redirectOnError('/finance/btc', result.error);
  });
  done('/finance/btc');
}

export async function createNetWorth(formData: FormData) {
  await checked('/finance/net-worth', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('net_worth_snapshots').insert({ user_id: userId, snapshot_date: dateValue(formData,'date'), assets_amount: amount(formData,'assets_amount'), liabilities_amount: amount(formData,'liabilities_amount'), note: value(formData,'note') || null });
    redirectOnError('/finance/net-worth', result.error);
  });
  done('/finance/net-worth');
}

export async function updateNetWorth(formData: FormData) {
  await checked('/finance/net-worth', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('net_worth_snapshots').update({ snapshot_date: dateValue(formData,'date'), assets_amount: amount(formData,'assets_amount'), liabilities_amount: amount(formData,'liabilities_amount'), note: value(formData,'note') || null }).eq('id', required(formData,'id','Net worth snapshot ID')).eq('user_id', userId);
    redirectOnError('/finance/net-worth', result.error);
  });
  done('/finance/net-worth');
}

export async function deleteNetWorth(formData: FormData) {
  await checked('/finance/net-worth', async () => {
    const { supabase, userId } = await requireUser();
    const result = await supabase.from('net_worth_snapshots').delete().eq('id', required(formData,'id','Net worth snapshot ID')).eq('user_id', userId);
    redirectOnError('/finance/net-worth', result.error);
  });
  done('/finance/net-worth');
}



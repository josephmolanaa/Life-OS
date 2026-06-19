export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TransactionType = 'income' | 'expense';
export type LoanDirection = 'give' | 'get';
export type LoanStatus = 'open' | 'settled' | 'cancelled';
export type WalletKind = 'cash' | 'bank' | 'ewallet' | 'crypto';

export type Wallet = { id: string; user_id: string; name: string; type: WalletKind; currency: string; initial_balance: number; is_archived: boolean; balance?: number; created_at: string; updated_at: string };
export type Category = { id: string; user_id: string; name: string; type: TransactionType; color: string; icon: string; is_default: boolean; created_at: string; updated_at: string };
export type Transaction = { id: string; user_id: string; wallet_id: string; category_id: string; type: TransactionType; amount: number; transaction_date: string; note: string | null; created_at: string; updated_at: string; categories?: Category; wallets?: Wallet };
export type Transfer = { id: string; user_id: string; from_wallet_id: string; to_wallet_id: string; amount: number; transfer_date: string; note: string | null; created_at: string; updated_at: string };
export type Loan = { id: string; user_id: string; wallet_id: string; direction: LoanDirection; person_name: string; amount: number; loan_date: string; due_date: string | null; status: LoanStatus; note: string | null; created_at: string; updated_at: string };
export type Budget = { id: string; user_id: string; category_id: string; month: string; amount: number; categories?: Category };
export type BtcDcaLog = { id: string; user_id: string; buy_date: string; fiat_amount: number; btc_amount: number; fee_amount: number; exchange: string | null; note: string | null };
export type NetWorthSnapshot = { id: string; user_id: string; snapshot_date: string; assets_amount: number; liabilities_amount: number; net_worth_amount: number; note: string | null };

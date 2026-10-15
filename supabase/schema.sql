-- Life OS core schema
create extension if not exists "pgcrypto";
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null default 'IDR',
  initial_balance numeric not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists wallets_id_user_id_key on public.wallets(id, user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  color text,
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists categories_id_user_id_key on public.categories(id, user_id);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null,
  category_id uuid,
  type text not null,
  amount numeric not null,
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions drop constraint if exists transactions_wallet_id_fkey;
alter table public.transactions drop constraint if exists transactions_category_id_fkey;
alter table public.transactions add constraint transactions_wallet_owner_fkey foreign key (wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;
alter table public.transactions add constraint transactions_category_owner_fkey foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_wallet_id uuid not null,
  to_wallet_id uuid not null,
  amount numeric not null,
  transfer_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transfers drop constraint if exists transfers_from_wallet_id_fkey;
alter table public.transfers drop constraint if exists transfers_to_wallet_id_fkey;
alter table public.transfers add constraint transfers_from_wallet_owner_fkey foreign key (from_wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;
alter table public.transfers add constraint transfers_to_wallet_owner_fkey foreign key (to_wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid,
  direction text not null,
  person_name text not null,
  amount numeric not null,
  loan_date date not null,
  due_date date,
  status text not null default 'open',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.loans drop constraint if exists loans_wallet_id_fkey;
alter table public.loans add constraint loans_wallet_owner_fkey foreign key (wallet_id, user_id) references public.wallets(id, user_id) on delete set null (wallet_id);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid,
  month text not null,
  amount numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.budgets drop constraint if exists budgets_category_id_fkey;
alter table public.budgets add constraint budgets_category_owner_fkey foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade;

create table if not exists public.btc_dca_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  btc_amount numeric not null,
  fiat_amount numeric not null,
  fee_amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  assets_amount numeric not null default 0,
  liabilities_amount numeric not null default 0,
  net_worth_amount numeric not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transfers enable row level security;
alter table public.loans enable row level security;
alter table public.budgets enable row level security;
alter table public.btc_dca_logs enable row level security;
alter table public.net_worth_snapshots enable row level security;

create policy "wallets owner" on public.wallets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories owner" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions owner" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transfers owner" on public.transfers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "loans owner" on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets owner" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "btc owner" on public.btc_dca_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "networth owner" on public.net_worth_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

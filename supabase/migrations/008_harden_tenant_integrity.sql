-- Abort all schema changes if existing data violates tenant integrity.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Keep finance foreign keys bound to the same owner as the referencing row.
create unique index if not exists wallets_id_user_id_key on public.wallets(id, user_id);
create unique index if not exists categories_id_user_id_key on public.categories(id, user_id);

alter table public.transactions drop constraint if exists transactions_wallet_id_fkey;
alter table public.transactions drop constraint if exists transactions_category_id_fkey;
alter table public.transactions add constraint transactions_wallet_owner_fkey
  foreign key (wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;
alter table public.transactions add constraint transactions_category_owner_fkey
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id);

alter table public.transfers drop constraint if exists transfers_from_wallet_id_fkey;
alter table public.transfers drop constraint if exists transfers_to_wallet_id_fkey;
alter table public.transfers add constraint transfers_from_wallet_owner_fkey
  foreign key (from_wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;
alter table public.transfers add constraint transfers_to_wallet_owner_fkey
  foreign key (to_wallet_id, user_id) references public.wallets(id, user_id) on delete cascade;

alter table public.loans drop constraint if exists loans_wallet_id_fkey;
alter table public.loans add constraint loans_wallet_owner_fkey
  foreign key (wallet_id, user_id) references public.wallets(id, user_id) on delete set null (wallet_id);

alter table public.budgets drop constraint if exists budgets_category_id_fkey;
alter table public.budgets add constraint budgets_category_owner_fkey
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete cascade;

-- These rows are owned records; reject future orphan rows and make ownership explicit.
alter table public.physique_weight_logs alter column user_id set not null;
alter table public.physique_checklists alter column user_id set not null;
alter table public.discipline_logs alter column user_id set not null;

drop policy if exists "Users can manage their own weight logs" on public.physique_weight_logs;
create policy "Users can manage their own weight logs" on public.physique_weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their own metrics" on public.physique_metrics;
create policy "Users can manage their own metrics" on public.physique_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their own checklists" on public.physique_checklists;
create policy "Users can manage their own checklists" on public.physique_checklists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can manage their own discipline logs" on public.discipline_logs;
create policy "Users can manage their own discipline logs" on public.discipline_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
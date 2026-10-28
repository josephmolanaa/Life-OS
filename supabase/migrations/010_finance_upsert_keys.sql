-- Keep the finance setup actions idempotent on fresh and existing projects.
create unique index if not exists wallets_user_name_key on public.wallets(user_id, name);
create unique index if not exists categories_user_name_type_key on public.categories(user_id, name, type);
create unique index if not exists budgets_user_category_month_key on public.budgets(user_id, category_id, month);

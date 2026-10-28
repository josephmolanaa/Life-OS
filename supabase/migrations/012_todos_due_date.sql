begin;
alter table public.todos add column if not exists due_date date;
create index if not exists todos_task_due_date_idx on public.todos (user_id, due_date) where list_kind = 'task';
commit;

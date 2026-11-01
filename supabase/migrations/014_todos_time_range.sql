begin;
alter table public.todos add column if not exists start_time time;
alter table public.todos add column if not exists end_time time;
create index if not exists todos_task_time_range_idx on public.todos (user_id, start_time, end_time) where list_kind = 'task';
commit;
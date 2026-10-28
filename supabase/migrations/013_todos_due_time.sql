begin;
alter table public.todos add column if not exists due_time time;
commit;

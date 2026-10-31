-- Study schedule table
create table if not exists public.study_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  course text not null,
  day text not null,
  sessions text,
  time text,
  room text,
  lecturer text,
  semester text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists study_schedule_id_user_id_key on public.study_schedule(id, user_id);
create index if not exists study_schedule_user_id_idx on public.study_schedule(user_id);

alter table public.study_schedule enable row level security;

drop policy if exists "study_schedule owner" on public.study_schedule;
create policy "study_schedule owner" on public.study_schedule
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

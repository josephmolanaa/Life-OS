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

create policy "study_schedule owner" on public.study_schedule
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed function to initialize from hardcoded data
create or replace function public.seed_study_schedule(p_user_id uuid)
returns void language plpgsql as $$
declare
  v_id uuid;
begin
  -- Clear existing for this user
  delete from public.study_schedule where user_id = p_user_id;

  -- Insert default schedule
  insert into public.study_schedule (user_id, code, course, day, sessions, time, room, lecturer, semester) values
  (p_user_id, 'NMNJ236034', 'Data Sains Untuk Analitik Pemasaran', 'SENIN', '4-6', '09.35 - 12.10', 'D9.110 Ged D9 OFFR A-MP1', 'SURYO HADI WIRA PRABOWO', 'Semester 7'),
  (p_user_id, 'UNIV236010', 'Manajemen Inovasi', 'SELASA', '7-9', '13.10 - 15.45', 'A20-516 Ged A20 OFFR G4-G4 (sementara T - D4)', null, 'Semester 7'),
  (p_user_id, 'NMNJ236035', 'Riset Pasar', 'KAMIS', '7-9', '13.10 - 15.45', 'D9.110 Ged D9 OFFR A-MP1', 'TITIS SHINTA DHEWI', 'Semester 7'),
  (p_user_id, 'NMNJ236032', 'Penelitian dan Seminar Pemasaran', 'JUMAT', '4-6', '09.35 - 12.10', 'D12.204 Ged D12 OFFR A-MP1', 'TITIS SHINTA DHEWI', 'Semester 7'),
  (p_user_id, 'NMNJ236043', 'Perencanaan Pemasaran', 'JUMAT', '10-12', '15.45 - 18.55', 'D8.106 Ged D8 OFFR B-MP2', 'AGUS HERMAWAN', 'Semester 7'),
  (p_user_id, 'NMNJ236111', 'Tugas Akhir', '-', '-', 'Bimbingan', '-', null, 'Semester 7')
  on conflict do nothing;
end;
$$;
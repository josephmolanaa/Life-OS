-- Create todos table for habit tracking
create table if not exists todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  done boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, label)
);

-- Create contributions table for consistency graph
create table if not exists contributions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  count integer default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, date)
);

-- Enable RLS
alter table todos enable row level security;
alter table contributions enable row level security;

-- RLS policies
create policy "Users can view their own todos" on todos
  for select using (auth.uid() = user_id);

create policy "Users can create todos" on todos
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own todos" on todos
  for update using (auth.uid() = user_id);

create policy "Users can delete their own todos" on todos
  for delete using (auth.uid() = user_id);

create policy "Users can view their own contributions" on contributions
  for select using (auth.uid() = user_id);

create policy "Users can insert contributions" on contributions
  for insert with check (auth.uid() = user_id);

create policy "Users can update contributions" on contributions
  for update using (auth.uid() = user_id);

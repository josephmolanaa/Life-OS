-- Create career_goals table
create table if not exists career_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  branch text not null, -- 'ai_engineer', 'economics', 'soft_skills'
  target_date date,
  status text not null default 'in_progress', -- 'not_started', 'in_progress', 'completed'
  progress_pct integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create career_skills table (sesuai cabang di draw.io)
create table if not exists career_skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  branch text not null, -- 'ai_engineer', 'economics', 'soft_skills'
  target_hours integer default 100,
  logged_hours numeric(10,2) default 0,
  status text default 'learning', -- 'want_to_learn', 'learning', 'mastered'
  created_at timestamp with time zone default now(),
  unique(user_id, slug)
);

-- Create career_projects table
create table if not exists career_projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  branch text not null,
  repo_url text,
  status text default 'building', -- 'idea', 'building', 'launched'
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table career_goals enable row level security;
alter table career_skills enable row level security;
alter table career_projects enable row level security;

-- Policies
create policy "Users can view own career goals" on career_goals for select using (auth.uid() = user_id);
create policy "Users can create own career goals" on career_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own career goals" on career_goals for update using (auth.uid() = user_id);
create policy "Users can delete own career goals" on career_goals for delete using (auth.uid() = user_id);

create policy "Users can view own career skills" on career_skills for select using (auth.uid() = user_id);
create policy "Users can create own career skills" on career_skills for insert with check (auth.uid() = user_id);
create policy "Users can update own career skills" on career_skills for update using (auth.uid() = user_id);
create policy "Users can delete own career skills" on career_skills for delete using (auth.uid() = user_id);

create policy "Users can view own career projects" on career_projects for select using (auth.uid() = user_id);
create policy "Users can create own career projects" on career_projects for insert with check (auth.uid() = user_id);
create policy "Users can update own career projects" on career_projects for update using (auth.uid() = user_id);
create policy "Users can delete own career projects" on career_projects for delete using (auth.uid() = user_id);

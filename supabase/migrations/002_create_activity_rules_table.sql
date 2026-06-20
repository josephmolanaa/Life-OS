-- Create activity_app_rules table for mapping raw apps to display names + categories
create table if not exists activity_app_rules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_type text not null, -- 'app' or 'title'
  match_value text not null, -- app name atau window title pattern
  display_name text not null,
  category text not null, -- work, play, learn, admin, etc
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, match_type, match_value)
);

-- Enable RLS
alter table activity_app_rules enable row level security;

-- RLS policies
create policy "Users can view their own rules" on activity_app_rules
  for select using (auth.uid() = user_id);

create policy "Users can create rules" on activity_app_rules
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own rules" on activity_app_rules
  for update using (auth.uid() = user_id);

create policy "Users can delete their own rules" on activity_app_rules
  for delete using (auth.uid() = user_id);

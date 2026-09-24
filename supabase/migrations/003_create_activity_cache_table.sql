-- Create activity_events_cache table for persisting ActivityWatch events
create table if not exists activity_events_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null,
  "window" text not null,
  category text,
  duration_seconds integer not null default 0,
  event_timestamp timestamp with time zone not null,
  source text not null default 'activitywatch',
  created_at timestamp with time zone default now(),
  unique(user_id, event_timestamp, app, "window")
);

create index if not exists idx_activity_cache_user_time
  on activity_events_cache(user_id, event_timestamp desc);

create index if not exists idx_activity_cache_user_category
  on activity_events_cache(user_id, category);

-- Enable RLS
alter table activity_events_cache enable row level security;

-- RLS policies
drop policy if exists "Users can view their own activity cache" on activity_events_cache;
create policy "Users can view their own activity cache" on activity_events_cache
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own activity cache" on activity_events_cache;
create policy "Users can insert their own activity cache" on activity_events_cache
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own activity cache" on activity_events_cache;
create policy "Users can update their own activity cache" on activity_events_cache
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own activity cache" on activity_events_cache;
create policy "Users can delete their own activity cache" on activity_events_cache
  for delete using (auth.uid() = user_id);

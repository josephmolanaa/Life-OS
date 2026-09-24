import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityRule } from './activitywatch-types';
import { applyActivityRules } from './activitywatch-rules';

export type CachedActivityEvent = {
  app: string;
  window: string;
  category?: string;
  duration_seconds: number;
  event_timestamp: string;
};

export async function saveActivityEventsToCache(
  supabase: SupabaseClient,
  userId: string,
  events: Array<{ app: string; window: string; timestamp: string; duration: number }>,
  rules: ActivityRule[],
) {
  if (!events.length) return;
  
  // Skip if too many events (prevents DB overload)
  if (events.length > 2000) return;

  const rows = events.map((ev) => {
    const category = applyActivityRules([{ app: ev.app, window: ev.window, minutes: 0, started: '' }], rules)[0]?.category ?? 'uncategorized';
    return {
      user_id: userId,
      app: ev.app,
      window: ev.window,
      category,
      duration_seconds: Math.round(ev.duration || 0),
      event_timestamp: ev.timestamp,
      source: 'activitywatch',
    };
  });

  // Batch in chunks of 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      await supabase
        .from('activity_events_cache')
        .upsert(batch, { onConflict: 'user_id,event_timestamp,app,window', ignoreDuplicates: true });
    } catch {
      // Cache failure must not break ActivityWatch reads.
    }
  }
}

export async function fetchActivityFromCache(
  supabase: SupabaseClient,
  userId: string,
  startIso: string,
  endIso: string,
) {
  const { data, error } = await supabase
    .from('activity_events_cache')
    .select('app, window, category, duration_seconds, event_timestamp')
    .eq('user_id', userId)
    .gte('event_timestamp', startIso)
    .lte('event_timestamp', endIso)
    .order('event_timestamp', { ascending: false });

  if (error || !data) return null;
  return data;
}

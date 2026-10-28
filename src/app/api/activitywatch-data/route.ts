import { NextResponse } from 'next/server';
import type { ActivityRule } from '@/lib/activitywatch-types';
import { createClient } from '@/lib/supabase/server';
import { applyActivityRules } from '@/lib/activitywatch-rules';
import { saveActivityEventsToCache, fetchActivityFromCache } from '@/lib/activitywatch-cache';

import { isDesktopActivity, trustedActivityRequest, hasActivityPermission } from '@/lib/activitywatch-permissions';

const CATEGORY_OPTIONS = ['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'] as const;

function emptyBucket(label: string): Record<string, number | string> {
  const bucket: Record<string, number | string> = { label };
  for (const cat of CATEGORY_OPTIONS) bucket[cat] = 0;
  return bucket;
}

function getCategory(app: string, title: string, rules: ActivityRule[]): string {
  return applyActivityRules([{ app, window: title, minutes: 0, started: '' }], rules)[0]?.category ?? 'uncategorized';
}

function processEventsToPayload(
  events: Array<{ app: string; window: string; timestamp: string; duration: number }>,
  rules: ActivityRule[],
  hostname: string,
  start: Date,
  rangeParam: string,
  statusMessage: string,
) {
  const merged = new Map<string, { app: string; window: string; seconds: number; started: string }>();
  for (const event of events) {
    const app = event.app;
    const win = event.window;
    const durationSeconds = event.duration;
    const started = new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const key = `${app} | ${win}`;
    const current = merged.get(key);
    merged.set(key, { app, window: win, seconds: (current?.seconds ?? 0) + durationSeconds, started: current?.started ?? started });
  }

  let timelineData: Record<string, number | string>[];

  if (rangeParam === '4h') {
    timelineData = Array.from({ length: 8 }, (_, i) => {
      const time = new Date(start.getTime() + i * 30 * 60 * 1000);
      return emptyBucket(time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    });
    for (const event of events) {
      const t = new Date(event.timestamp).getTime();
      const idx = Math.floor((t - start.getTime()) / (30 * 60 * 1000));
      if (idx >= 0 && idx < 8) {
        const cat = getCategory(event.app, event.window, rules);
        (timelineData[idx][cat] as number) += event.duration;
      }
    }
  } else if (rangeParam === '1d') {
    timelineData = Array.from({ length: 24 }, (_, i) => emptyBucket(String(i).padStart(2, '0') + ':00'));
    for (const event of events) {
      const hour = new Date(event.timestamp).getHours();
      if (hour >= 0 && hour < 24) {
        const cat = getCategory(event.app, event.window, rules);
        (timelineData[hour][cat] as number) += event.duration;
      }
    }
  } else if (rangeParam === '1w') {
    timelineData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      return emptyBucket(d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }));
    });
    for (const event of events) {
      const t = new Date(event.timestamp).getTime();
      const idx = Math.floor((t - start.getTime()) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < 7) {
        const cat = getCategory(event.app, event.window, rules);
        (timelineData[idx][cat] as number) += event.duration;
      }
    }
  } else {
    timelineData = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      return emptyBucket(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    });
    for (const event of events) {
      const t = new Date(event.timestamp).getTime();
      const idx = Math.floor((t - start.getTime()) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < 30) {
        const cat = getCategory(event.app, event.window, rules);
        (timelineData[idx][cat] as number) += event.duration;
      }
    }
  }

  for (const bucket of timelineData) {
    for (const cat of CATEGORY_OPTIONS) {
      bucket[cat] = Math.round((bucket[cat] as number) / 60);
    }
  }

  const items = Array.from(merged.values()).map(item => ({
    app: item.app,
    window: item.window,
    minutes: Math.max(1, Math.round(item.seconds / 60)),
    started: item.started,
  })).sort((a, b) => b.minutes - a.minutes);

  return { items, status: statusMessage, hostname, timelineData };
}

export async function GET(request: Request) {
  const desktop = isDesktopActivity();
  if (desktop && !trustedActivityRequest(request)) return NextResponse.json({ error: 'Desktop access required' }, { status: 403 });
  let user = null;
  let supabase = null;
  try {
    supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    user = currentUser;
  } catch {
    return NextResponse.json({ error: 'Authentication unavailable' }, { status: 503 });
  }
  if (!user || !supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (desktop) {
    try {
      if (!hasActivityPermission(user.id)) return NextResponse.json({ error: 'Activity permission required' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'Permission storage unavailable' }, { status: 503 });
    }
  }

  let rules: ActivityRule[] = [];
  if (user && supabase) {
    const { data: ruleData } = await supabase
      .from('activity_app_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    rules = ruleData || [];
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  const rangeParam = url.searchParams.get('range') || '1m';
  if (!['4h', '1d', '1w', '1m'].includes(rangeParam)) return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });

  let start: Date;
  let end: Date;
  let anchor: Date;

  if (dateParam) {
    const [year, month, day] = dateParam.split('-').map(Number);
    anchor = new Date(year, month - 1, day, 23, 59, 59, 999);
    if (Number.isNaN(anchor.getTime()) || anchor.getFullYear() !== year || anchor.getMonth() !== month - 1 || anchor.getDate() !== day) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  } else {
    anchor = new Date();
  }

  if (rangeParam === '4h') {
    end = anchor;
    start = new Date(anchor.getTime() - 4 * 60 * 60 * 1000);
  } else if (rangeParam === '1d') {
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const day = anchor.getDate();
    start = new Date(year, month, day, 0, 0, 0, 0);
    end = new Date(year, month, day, 23, 59, 59, 999);
  } else if (rangeParam === '1w') {
    end = anchor;
    start = new Date(anchor.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    end = anchor;
    start = new Date(anchor.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Local ActivityWatch belongs to one machine owner. Allow either the stable
  // Supabase ID or email so setup does not require looking up a UUID.
  const configuredOwnerId = process.env.ACTIVITYWATCH_OWNER_ID?.trim();
  const configuredOwnerEmail = process.env.ACTIVITYWATCH_OWNER_EMAIL?.trim().toLowerCase();
  const canReadLiveDevice = desktop || Boolean(
    (configuredOwnerId && configuredOwnerId === user.id) ||
    (configuredOwnerEmail && user.email?.toLowerCase() === configuredOwnerEmail),
  );
  // 1. Coba fetch dari ActivityWatch live
  try {
    // The watcher belongs to the server's owner, not every signed-in account.
    if (!canReadLiveDevice) throw new Error('Live device access disabled');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const bucketsResponse = await fetch('http://127.0.0.1:5600/api/0/buckets', { cache: 'no-store', signal: controller.signal }).finally(() => clearTimeout(timeoutId));
    if (!bucketsResponse.ok) throw new Error('ActivityWatch offline');
    const buckets = await bucketsResponse.json();

    const windowBucketKey = Object.keys(buckets).find((key) => key.includes('aw-watcher-window'));
    if (!windowBucketKey) throw new Error('Window bucket missing');

    const eventsCtrl = new AbortController();
    const evTimeoutId = setTimeout(() => eventsCtrl.abort(), 5000);
    const eventsResponse = await fetch(
      `http://127.0.0.1:5600/api/0/buckets/${windowBucketKey}/events?start=${start.toISOString()}&end=${end.toISOString()}`,
      { cache: 'no-store', signal: eventsCtrl.signal }
    ).finally(() => clearTimeout(evTimeoutId));
    if (!eventsResponse.ok) throw new Error('Event fetch failed');
    const rawEvents = await eventsResponse.json();

    const normalizedEvents = rawEvents.map((e: { data?: { app?: string; window?: string; title?: string }; timestamp: string; duration?: number }) => ({
      app: e.data?.app ?? e.data?.window ?? 'Unknown',
      window: e.data?.title ?? e.data?.window ?? (e.data?.app ?? 'Unknown'),
      timestamp: e.timestamp,
      duration: e.duration ?? 0,
    }));

    const hostname = buckets[windowBucketKey].hostname ?? 'Unknown';

    // Async write-through ke Supabase cache kalau user login
    if (!desktop && user && supabase) {
      saveActivityEventsToCache(supabase, user.id, normalizedEvents, rules).catch(() => {});
    }

    const payload = processEventsToPayload(normalizedEvents, rules, hostname, start, rangeParam, 'Live ActivityWatch data');
    if (desktop && !hasActivityPermission(user.id)) return NextResponse.json({ error: 'Activity permission revoked' }, { status: 403 });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    if (desktop) return NextResponse.json({ items: [], status: 'ActivityWatch offline or permission unavailable', hostname: 'Unknown', timelineData: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    // 2. AW Offline: Fallback ke Supabase Cache
    if (user && supabase) {
      try {
        const cached = await fetchActivityFromCache(supabase, user.id, start.toISOString(), end.toISOString());
        if (cached && cached.length > 0) {
          const cachedEvents = cached.map((c) => ({
            app: c.app,
            window: c.window,
            timestamp: c.event_timestamp,
            duration: c.duration_seconds,
          }));
          const payload = processEventsToPayload(cachedEvents, rules, 'Cached Device', start, rangeParam, 'Cached activity data');
          return NextResponse.json(payload);
        }
      } catch {
        // Cache fail
      }
    }

    // 3. Fallback total kalau gak ada data sama sekali
    return NextResponse.json({
      items: [],
      status: canReadLiveDevice ? 'Offline (No cached data)' : 'Live device access unavailable (No cached data)',
      hostname: 'Unknown',
      timelineData: [],
    }, { status: 200 });
  }
}

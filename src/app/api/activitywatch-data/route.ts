import { NextResponse } from 'next/server';
import type { ActivityRule } from '@/lib/activitywatch-types';
import { createClient } from '@/lib/supabase/server';
import { applyActivityRules } from '@/lib/activitywatch-rules';

const CATEGORY_OPTIONS = ['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'] as const;

function emptyBucket(label: string): Record<string, number | string> {
  const bucket: Record<string, number | string> = { label };
  for (const cat of CATEGORY_OPTIONS) bucket[cat] = 0;
  return bucket;
}

function getCategory(app: string, title: string, rules: ActivityRule[]): string {
  return applyActivityRules([{ app, window: title, minutes: 0, started: '' }], rules)[0]?.category ?? 'uncategorized';
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let rules: ActivityRule[] = [];
    if (user) {
      const { data: ruleData } = await supabase
        .from('activity_app_rules')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      rules = ruleData || [];
    }

    const bucketsResponse = await fetch('http://127.0.0.1:5600/api/0/buckets', { cache: 'no-store' });
    if (!bucketsResponse.ok) throw new Error('ActivityWatch offline');
    const buckets = await bucketsResponse.json();

    const windowBucketKey = Object.keys(buckets).find((key) => key.includes('aw-watcher-window'));
    if (!windowBucketKey) throw new Error('Window bucket missing');

    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const rangeParam = url.searchParams.get('range') || '1m';

    let start: Date;
    let end: Date;
    let anchor: Date;

    if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      anchor = new Date(year, month - 1, day, 23, 59, 59, 999);
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

    const eventsResponse = await fetch(
      `http://127.0.0.1:5600/api/0/buckets/${windowBucketKey}/events?start=${start.toISOString()}&end=${end.toISOString()}`,
      { cache: 'no-store' }
    );
    if (!eventsResponse.ok) throw new Error('Event fetch failed');
    const events = await eventsResponse.json();

    const merged = new Map<string, { app: string; window: string; seconds: number; started: string }>();
    for (const event of events) {
      const app = event.data?.app ?? event.data?.window ?? 'Unknown';
      const win = event.data?.title ?? event.data?.window ?? app;
      const durationSeconds = event.duration ?? 0;
      const started = new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const key = `${app} | ${win}`;
      const current = merged.get(key);
      merged.set(key, { app, window: win, seconds: (current?.seconds ?? 0) + durationSeconds, started: current?.started ?? started });
    }

    const hostname = buckets[windowBucketKey].hostname ?? 'Unknown';

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
          const cat = getCategory(event.data?.app || 'Unknown', event.data?.title || 'Unknown', rules);
          (timelineData[idx][cat] as number) += (event.duration ?? 0);
        }
      }
    } else if (rangeParam === '1d') {
      timelineData = Array.from({ length: 24 }, (_, i) => emptyBucket(String(i).padStart(2, '0') + ':00'));
      for (const event of events) {
        const hour = new Date(event.timestamp).getHours();
        if (hour >= 0 && hour < 24) {
          const cat = getCategory(event.data?.app || 'Unknown', event.data?.title || 'Unknown', rules);
          (timelineData[hour][cat] as number) += (event.duration ?? 0);
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
          const cat = getCategory(event.data?.app || 'Unknown', event.data?.title || 'Unknown', rules);
          (timelineData[idx][cat] as number) += (event.duration ?? 0);
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
          const cat = getCategory(event.data?.app || 'Unknown', event.data?.title || 'Unknown', rules);
          (timelineData[idx][cat] as number) += (event.duration ?? 0);
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

    return NextResponse.json({ items, status: 'Live ActivityWatch data', hostname, timelineData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ items: [], status: 'Offline: ' + message, hostname: 'Unknown', timelineData: [] }, { status: 200 });
  }
}

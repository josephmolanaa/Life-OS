"use client";

import { useEffect, useMemo, useState } from 'react';
import { Shell } from '@/components/finance/layout';

type AwItem = {
  app: string;
  window: string;
  minutes: number;
  started: string;
};

const fallbackItems: AwItem[] = [
  { app: 'Visual Studio Code', window: 'app.js - Life OS', minutes: 84, started: '09:20' },
  { app: 'Google Chrome', window: 'ActivityWatch docs', minutes: 31, started: '10:50' },
  { app: 'WhatsApp', window: 'Chat with team', minutes: 12, started: '11:40' },
];

function formatMinutes(minutes: number) {
  return `${minutes}m`;
}

export default function ActivityPage() {
  const [items, setItems] = useState<AwItem[]>(fallbackItems);
  const [status, setStatus] = useState('Fallback data loaded');

  useEffect(() => {
    const load = async () => {
      try {
        const bucketsResponse = await fetch('http://localhost:5600/api/0/buckets');
        if (!bucketsResponse.ok) throw new Error('ActivityWatch offline');
        const buckets = await bucketsResponse.json();
        const windowBucketKey = Object.keys(buckets).find((key) => key.includes('aw-watcher-window'));
        if (!windowBucketKey) throw new Error('Window bucket missing');

        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const eventsResponse = await fetch(
          `http://localhost:5600/api/0/buckets/${windowBucketKey}/events?start=${start.toISOString()}&end=${end.toISOString()}`,
        );
        if (!eventsResponse.ok) throw new Error('Event fetch failed');

        const events = await eventsResponse.json();
        const merged = new Map<string, AwItem>();

        for (const event of events) {
          const app = event.data?.app ?? event.data?.window ?? 'Unknown';
          const window = event.data?.title ?? event.data?.window ?? app;
          const minutes = Math.max(1, Math.round((event.duration ?? 0) / 60));
          const started = new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const key = `${app} | ${window}`;
          const current = merged.get(key);
          merged.set(key, {
            app,
            window,
            minutes: (current?.minutes ?? 0) + minutes,
            started: current?.started ?? started,
          });
        }

        setItems(Array.from(merged.values()).sort((left, right) => right.minutes - left.minutes).slice(0, 12));
        setStatus('Live ActivityWatch data');
      } catch {
        setItems(fallbackItems);
        setStatus('Fallback data loaded');
      }
    };

    void load();
  }, []);

  const totalMinutes = useMemo(() => items.reduce((sum, item) => sum + item.minutes, 0), [items]);

  return (
    <Shell title="ActivityWatch" quickFab={false}>
      <div className="mx-auto flex flex-col gap-4">
        <header className="card" style={{ padding: '20px' }}>
          <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>ActivityWatch</p>
          <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>Raw Activity Feed</h1>
          <p className="muted" style={{ margin: 0 }}>Ambil data app/window aktif langsung dari ActivityWatch lokal.</p>
          <div className="row" style={{ marginTop: '16px', gap: '8px' }}>
            <span className="pill">Status: {status}</span>
            <span className="pill">Items: {items.length}</span>
            <span className="pill">Total: {formatMinutes(totalMinutes)}</span>
          </div>
        </header>

        <section className="grid" style={{ gap: '10px' }}>
          {items.map((item) => (
            <article key={`${item.app}-${item.window}-${item.started}`} className="card" style={{ padding: '16px' }}>
              <div className="row">
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{item.app}</h2>
                  <p className="muted" style={{ fontSize: '12px', margin: '4px 0 0' }}>{item.window}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--green)' }}>{formatMinutes(item.minutes)}</p>
                  <p className="muted" style={{ fontSize: '10px', margin: '2px 0 0' }}>start {item.started}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </Shell>
  );
}

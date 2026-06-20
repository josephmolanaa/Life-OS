"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { applyActivityRules } from '@/lib/activitywatch-rules';
import type { ActivityRule, ActivityWatchItem } from '@/lib/activitywatch-types';

const categoryOptions = ['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'] as const;
const fallbackItems: ActivityWatchItem[] = [
  { app: 'Visual Studio Code', window: 'app.js - Life OS', minutes: 84, started: '09:20' },
  { app: 'Google Chrome', window: 'ActivityWatch docs', minutes: 31, started: '10:50' },
  { app: 'WhatsApp', window: 'Chat with team', minutes: 12, started: '11:40' },
];

function formatMinutes(minutes: number) {
  return `${minutes}m`;
}

async function loadRules(): Promise<ActivityRule[]> {
  const response = await fetch('/api/activity-rules', { cache: 'no-store' });
  if (!response.ok) return [];
  return response.json();
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityWatchItem[]>(fallbackItems);
  const [status, setStatus] = useState('Fallback data loaded');
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: '', category: 'work' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const run = async () => {
      const nextRules = await loadRules().catch(() => []);
      setRules(nextRules);
    };
    void run();
  }, []);

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
        const eventsResponse = await fetch(`http://localhost:5600/api/0/buckets/${windowBucketKey}/events?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (!eventsResponse.ok) throw new Error('Event fetch failed');
        const events = await eventsResponse.json();
        const merged = new Map<string, ActivityWatchItem>();
        for (const event of events) {
          const app = event.data?.app ?? event.data?.window ?? 'Unknown';
          const window = event.data?.title ?? event.data?.window ?? app;
          const minutes = Math.max(1, Math.round((event.duration ?? 0) / 60));
          const started = new Date(event.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const key = `${app} | ${window}`;
          const current = merged.get(key);
          merged.set(key, { app, window, minutes: (current?.minutes ?? 0) + minutes, started: current?.started ?? started });
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

  const mappedItems = useMemo(() => applyActivityRules(items, rules), [items, rules]);
  const totalMinutes = useMemo(() => mappedItems.reduce((sum, item) => sum + item.minutes, 0), [mappedItems]);
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    mappedItems.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.minutes));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [mappedItems]);

  const openQuickRule = (app: string, currentDisplay: string, currentCat: string) => {
    setSelectedApp(app);
    setForm({ display_name: currentDisplay === app ? '' : currentDisplay, category: currentCat === 'uncategorized' ? 'work' : currentCat });
    setNotice('');
  };

  const saveQuickRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedApp) return;
    setSaving(true);
    setNotice('');
    const ruleData = { match_type: 'app', match_value: selectedApp, display_name: form.display_name || selectedApp, category: form.category };
    const response = await fetch('/api/activity-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ruleData) });
    if (response.ok) {
      const nextRules = await loadRules().catch(() => []);
      setRules(nextRules);
      setSelectedApp(null);
      setNotice(`Rule saved for ${selectedApp}`);
    } else {
      setNotice('Rule gagal disimpan');
    }
    setSaving(false);
  };

  const cancelQuickRule = () => {
    setSelectedApp(null);
    setSaving(false);
    setNotice('');
  };

  return (
    <Shell title="ActivityWatch Module" quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <header className="card" style={{ padding: '20px' }}>
          <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: 0 }}>ActivityWatch</p>
          <h1 className="big" style={{ margin: '8px 0 6px', fontSize: '28px' }}>Raw Activity Feed</h1>
          <p className="muted" style={{ margin: 0 }}>Ambil data app/window aktif langsung dari ActivityWatch lokal. Klik app untuk ganti nama/category.</p>
          <div className="row" style={{ marginTop: '16px', gap: '8px' }}>
            <span className="pill">Status: {status}</span>
            <span className="pill">Items: {mappedItems.length}</span>
            <span className="pill">Total: {formatMinutes(totalMinutes)}</span>
            <Link className="pill" href="/activitywatch/rules">Manage Rules</Link>
          </div>
        </header>

        {selectedApp && (
          <form className="card" onSubmit={saveQuickRule} style={{ padding: '20px', display: 'grid', gap: '12px', border: '1px solid var(--accent)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Quick Rule: {selectedApp}</h2>
            <p className="muted" style={{ margin: 0 }}>Klik item ini buat assign name/category. Rule bakal overwrite kalau app sama sudah ada.</p>
            <input className="input" placeholder={`Display Name (e.g. ${selectedApp})`} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            <input className="input" placeholder="Category (e.g. game, work, play)" list="categories-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <datalist id="categories-list">
              {categoryOptions.map((cat) => <option key={cat} value={cat} />)}
            </datalist>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save rule'}</button>
              <button className="btn ghost" type="button" onClick={cancelQuickRule}>Cancel</button>
            </div>
            {notice && <p className="muted" style={{ margin: 0 }}>{notice}</p>}
          </form>
        )}

        <section className="card" style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Summary by Category</h2>
          <div className="grid" style={{ gap: '8px', marginTop: '12px' }}>
            {categorySummary.map(([category, minutes]) => <div key={category} className="row"><span className="pill">{category}</span><strong>{formatMinutes(minutes)}</strong></div>)}
          </div>
        </section>

        <section className="grid" style={{ gap: '10px' }}>
          {mappedItems.map((item) => (
            <article key={`${item.app}-${item.window}-${item.started}`} className="card" style={{ padding: '16px', cursor: 'pointer' }} onClick={() => openQuickRule(item.app, item.display_name, item.category)}>
              <div className="row">
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{item.display_name}</h2>
                  <p className="muted" style={{ fontSize: '12px', margin: '4px 0 0' }}>{item.window}</p>
                  <p className="muted" style={{ fontSize: '11px', margin: '4px 0 0' }}>Category: {item.category}</p>
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

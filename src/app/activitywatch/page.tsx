"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { applyActivityRules } from '@/lib/activitywatch-rules';
import type { ActivityRule, ActivityWatchItem } from '@/lib/activitywatch-types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getLang, copy, type Lang, type Translation } from '@/lib/i18n';

const categoryOptions = ['work', 'play', 'learn', 'admin', 'social', 'health', 'uncategorized'] as const;
const rangeOptions = [
  { value: '4h', label: '4H' },
  { value: '1d', label: '24H' },
  { value: '1w', label: '7D' },
  { value: '1m', label: '1M' }
] as const;

const categoryEmojis: Record<string, string> = {
  work: '\u{1F4BC} work',
  play: '\u{1F3AE} play',
  learn: '\u{1F4DA} learn',
  admin: '\u{2699}\u{FE0F} admin',
  social: '\u{1F4AC} social',
  health: '\u{1F34F} health',
  uncategorized: '\u{2753} uncategorized'
};

const categoryColors: Record<string, string> = {
  work: '#3b82f6', // blue
  play: '#ec4899', // pink
  learn: '#10b981', // green
  admin: '#6b7280', // gray
  social: '#f59e0b', // orange
  health: '#84cc16', // lime
  uncategorized: '#64748b' // slate
};

const fallbackItems: ActivityWatchItem[] = [
  { app: 'Visual Studio Code', window: 'app.js - Life OS', minutes: 84, started: '09:20' },
  { app: 'Google Chrome', window: 'ActivityWatch docs', minutes: 31, started: '10:50' },
  { app: 'WhatsApp', window: 'Chat with team', minutes: 12, started: '11:40' },
];

function formatMinutes(minutes: number, _range?: string) {
  if (minutes >= 24 * 60) {
    const d = Math.floor(minutes / (24 * 60));
    const h = Math.floor((minutes % (24 * 60)) / 60);
    const m = Math.round(minutes % 60);
    let result = `${d}d`;
    if (h > 0) result += ` ${h}h`;
    if (m > 0) result += ` ${m}m`;
    return result;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

async function loadRules(): Promise<ActivityRule[]> {
  const response = await fetch('/api/activity-rules', { cache: 'no-store' });
  if (!response.ok) return [];
  return response.json();
}

export default function ActivityPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [t, setT] = useState<Translation>(copy.en);
  const [items, setItems] = useState<ActivityWatchItem[]>(fallbackItems);
  const [status, setStatus] = useState('Fallback data loaded');
  const [rules, setRules] = useState<ActivityRule[]>([]);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: '', category: 'work' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const [hostname, setHostname] = useState('Unknown');
  const [hourlyActivity, setHourlyActivity] = useState([]);
  const [range, setRange] = useState('1d');
  const [appTimeframe, setAppTimeframe] = useState('1d');
  const [windowTimeframe, setWindowTimeframe] = useState('1d');
  const [appData, setAppData] = useState([]);
  const [windowData, setWindowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [listLimit, setListLimit] = useState(15);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  });

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  useEffect(() => {
    const run = async () => {
      const nextRules = await loadRules().catch(() => []);
      setRules(nextRules);
    };
    void run();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/activitywatch-data?date=${selectedDate}&range=${range}`);
        if (!response.ok) throw new Error('Proxy offline');
        const data = await response.json();
        if (data.items) {
          setItems(data.items.slice(0, 100));
          setStatus(data.status || 'Live ActivityWatch data');
          setHostname(data.hostname || 'Unknown');
          setHourlyActivity(data.timelineData || []);
        } else {
          setItems(fallbackItems);
          setStatus('Fallback data loaded');
          setHostname('Unknown');
          setHourlyActivity([]);
        }
      } catch {
        setItems(fallbackItems);
        setStatus('Fallback data loaded');
        setHostname('Unknown');
        setHourlyActivity([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [selectedDate, range]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchAppData = async () => {
      try {
        const response = await fetch(`/api/activitywatch-data?date=${selectedDate}&range=${appTimeframe}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setAppData(data.items || []);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setAppData([]);
      }
    };
    void fetchAppData();
    return () => controller.abort();
  }, [selectedDate, appTimeframe]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchWindowData = async () => {
      try {
        const response = await fetch(`/api/activitywatch-data?date=${selectedDate}&range=${windowTimeframe}`, { signal: controller.signal });
        if (response.ok) {
          const data = await response.json();
          setWindowData(data.items || []);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setWindowData([]);
      }
    };
    void fetchWindowData();
    return () => controller.abort();
  }, [selectedDate, windowTimeframe]);

  const mappedItems = useMemo(() => applyActivityRules(items, rules), [items, rules]);
  const totalMinutes = useMemo(() => mappedItems.reduce((sum, item) => sum + item.minutes, 0), [mappedItems]);
  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    mappedItems.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + item.minutes));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [mappedItems]);

  const filteredItems = useMemo(() => {
    let result = mappedItems;
    if (filterCategory !== 'all') {
      result = result.filter(item => item.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.app.toLowerCase().includes(q) ||
        (item.window && item.window.toLowerCase().includes(q)) ||
        (item.display_name && item.display_name.toLowerCase().includes(q))
      );
    }
    return result;
  }, [mappedItems, filterCategory, searchQuery]);

  const appUsageSummary = useMemo(() => {
    const appData = new Map<string, { minutes: number; categories: Record<string, number> }>();
    mappedItems.forEach(item => {
      const current = appData.get(item.display_name) ?? { minutes: 0, categories: {} };
      current.minutes += item.minutes;
      const cat = item.category || 'uncategorized';
      current.categories[cat] = (current.categories[cat] || 0) + item.minutes;
      appData.set(item.display_name, current);
    });

    const sorted = Array.from(appData.entries()).sort((a, b) => b[1].minutes - a[1].minutes);
    const max = sorted[0]?.[1].minutes || 1;

    return sorted.slice(0, 6).map(([name, data]) => {
      let dominantCategory = 'uncategorized';
      let maxCatMinutes = 0;
      Object.entries(data.categories).forEach(([cat, mins]) => {
        if (mins > maxCatMinutes) {
          maxCatMinutes = mins;
          dominantCategory = cat;
        }
      });
      return {
        name,
        minutes: data.minutes,
        category: dominantCategory,
        percentage: Math.round((data.minutes / max) * 100),
        totalPct: totalMinutes > 0 ? Math.round((data.minutes / totalMinutes) * 100) : 0
      };
    });
  }, [mappedItems, totalMinutes]);

  const windowUsageSummary = useMemo(() => {
    const map = new Map<string, number>();
    mappedItems.forEach(item => {
      const name = item.window || item.display_name;
      map.set(name, (map.get(name) ?? 0) + item.minutes);
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    return sorted.slice(0, 6).map(([name, minutes]) => ({
      name,
      minutes,
      percentage: Math.round((minutes / max) * 100),
      totalPct: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0
    }));
  }, [mappedItems, totalMinutes]);

  const uncategorizedMinutes = useMemo(() => {
    const found = categorySummary.find(([cat]) => cat === 'uncategorized');
    return found ? found[1] : 0;
  }, [categorySummary]);

  const uncategorizedPercentage = useMemo(() => {
    if (totalMinutes === 0) return 0;
    return Math.round((uncategorizedMinutes / totalMinutes) * 100);
  }, [uncategorizedMinutes, totalMinutes]);

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

  const quickAssignCategory = async (app: string, category: string) => {
    const existingRule = rules.find(r => r.match_type === 'app' && r.match_value.toLowerCase() === app.toLowerCase());
    const display_name = existingRule?.display_name || app;
    const ruleData = {
      match_type: 'app',
      match_value: app,
      display_name,
      category
    };
    const response = await fetch('/api/activity-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData)
    });
    if (response.ok) {
      const nextRules = await loadRules().catch(() => []);
      setRules(nextRules);
    }
  };

  return (
    <Shell title="ActivityWatch Module" quickFab={false}>
      <div style={{ display: 'grid', gap: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { opacity: 0.4; }
            50% { opacity: 0.8; }
            100% { opacity: 0.4; }
          }
          .skeleton {
            animation: shimmer 1.5s infinite ease-in-out;
            background: var(--border2, #262522);
            border-radius: 4px;
          }
          .category-select {
            cursor: pointer;
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid var(--border, #333);
            background: var(--card-bg, #1a1917);
            color: var(--text, #eae9e5);
            outline: none;
            transition: all 0.15s ease;
          }
          .category-select:hover {
            border-color: var(--accent);
          }
          .feed-item {
            padding: 10px 14px;
            border-radius: 8px;
            border-bottom: 1px solid var(--border2, #262522);
            transition: background 0.15s ease;
          }
          .feed-item:hover {
            background: rgba(255, 255, 255, 0.02);
          }
          .progress-track {
            background: var(--border2, #262522);
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            width: 100%;
          }
          .progress-bar {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
          }
          .dashboard-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 24px;
          }
          @media (max-width: 968px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }
          }
        ` }} />

        {/* Top Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="daySwitcher" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="dayArrow" type="button" onClick={() => changeDate(-1)} aria-label="Previous day">&lsaquo;</button>
            <div className="dayPicker">
              <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <button className="dayArrow" type="button" onClick={() => changeDate(1)} aria-label="Next day">&rsaquo;</button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="pill"
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  border: range === opt.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: range === opt.value ? 'var(--accent)' : 'transparent',
                  color: range === opt.value ? 'var(--accentText)' : 'var(--text2)',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '12px'
                }}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Metrics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px', background: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '12px' }}>&#x23F1;&#xFE0F;</div>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Active</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700 }}>{formatMinutes(totalMinutes, range)}</h3>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>&#x1F4BB;</div>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device Host</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700 }}>{hostname}</h3>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px', background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>&#x1F3F7;&#xFE0F;</div>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categorized</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700 }}>{100 - uncategorizedPercentage}%</h3>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '28px', background: uncategorizedPercentage > 30 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)', padding: '12px', borderRadius: '12px' }}>&#x2753;</div>
            <div>
              <p className="muted" style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uncategorized</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: uncategorizedPercentage > 30 ? '#ef4444' : 'inherit' }}>
                {formatMinutes(uncategorizedMinutes, range)}
              </h3>
            </div>
          </div>
        </div>

        {/* Modal Quick Rule Overlay */}
        {selectedApp && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }} onClick={cancelQuickRule}>
            <form className="card" onSubmit={saveQuickRule} style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              display: 'grid',
              gap: '16px',
              border: '1px solid var(--accent)',
              background: 'var(--bg, #1a1917)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              borderRadius: '12px'
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Quick Rule: {selectedApp}</h2>
              <p className="muted" style={{ margin: 0, fontSize: '13px' }}>Assign custom name & default category. Rule overwrite match yang sama.</p>
              
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Display Name</label>
                <input className="input" placeholder={`e.g. ${selectedApp}`} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>Category</label>
                <input className="input" placeholder="Category (e.g. work, play)" list="categories-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%' }} />
                <datalist id="categories-list">
                  {categoryOptions.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button className="btn ghost" type="button" onClick={cancelQuickRule}>Cancel</button>
                <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save rule'}</button>
              </div>
              {notice && <p className="muted" style={{ margin: 0 }}>{notice}</p>}
            </form>
          </div>
        )}

        {/* Dashboard Content Grid */}
        <div className="dashboard-grid">
          {/* Main Visuals Column (Left) */}
          <div style={{ display: 'grid', gap: '24px', alignContent: 'start' }}>
            {/* Timeline */}
            <section className="card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Activity Timeline</span>
                <span className="muted" style={{ fontSize: '12px', fontWeight: 'normal' }}>{status}</span>
              </h2>
              <div style={{ height: '80px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyActivity} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                      <XAxis type="category" dataKey="label" hide />
                      <YAxis type="number" hide />
                      <Tooltip 
                        labelStyle={{ color: '#1A1917' }} 
                        labelFormatter={(label) => selectedDate + " " + String(label)}
                        formatter={(val, name) => {
                          if (!val || Number(val) === 0) return [null, ""];
                          return [formatMinutes(Number(val)), categoryEmojis[name as string] || (name as string)];
                        }}
                      />
                      {categoryOptions.map((cat) => (
                        <Bar 
                          key={cat} 
                          dataKey={cat} 
                          stackId="a" 
                          fill={categoryColors[cat] || '#64748b'} 
                          radius={[0, 0, 0, 0]} 
                        />
                      ))}
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Top Apps List */}
            <section className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Top Applications</h2>
                

              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {loading ? (
                  [1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: '36px' }} />)
                ) : (
                  appUsageSummary.map(app => (
                    <div key={app.name} style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{app.name}</span>
                        <span className="muted" style={{ fontSize: '12px' }}>{formatMinutes(app.minutes, appTimeframe)} ({app.totalPct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${app.percentage}%`, background: categoryColors[app.category] || 'var(--accent, #3b82f6)' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Top Windows List */}
            <section className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Top Active Windows</h2>
                

              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                {loading ? (
                  [1, 2, 3].map(n => <div key={n} className="skeleton" style={{ height: '36px' }} />)
                ) : (
                  windowUsageSummary.map(win => (
                    <div key={win.name} style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%', fontSize: '12px' }} className="muted">{win.name}</span>
                        <span className="muted" style={{ fontSize: '11px' }}>{formatMinutes(win.minutes, windowTimeframe)} ({win.totalPct}%)</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${win.percentage}%`, background: '#38bdf8' }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Column (Right) */}
          <div style={{ display: 'grid', gap: '24px', alignContent: 'start' }}>
            {/* Category Breakdown */}
            <section className="card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>Category Breakdown</h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                {categorySummary.map(([category, minutes]) => {
                  const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
                  const color = categoryColors[category] || '#64748b';
                  return (
                    <div key={category} style={{ display: 'grid', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                          <span style={{ textTransform: 'capitalize' }}>{categoryEmojis[category] || category}</span>
                        </span>
                        <span>
                          <strong>{formatMinutes(minutes)}</strong> <span className="muted" style={{ fontSize: '11px' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions / Link Card */}
            <section className="card" style={{ padding: '20px', display: 'grid', gap: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{t.categoryRules}</h2>
              <p className="muted" style={{ margin: 0, fontSize: '12px' }}>
                {t.categoryRulesDesc}
              </p>
              <Link className="pill" href="/activitywatch/rules" style={{ textAlign: 'center', fontWeight: 'bold', display: 'block', padding: '10px' }}>
                {t.manageRulesEngine}
              </Link>
            </section>
          </div>
        </div>

        {/* Bottom Section: Unified Activity Log */}
        <section className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Activity Log Feed</h2>
            
            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '600px' }}>
              <input
                className="input"
                placeholder="&#x1F50D; Search app atau window title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, minWidth: '180px' }}
              />
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="category-select"
                style={{ height: '40px', padding: '0 12px' }}
              >
                <option value="all">Semua Kategori</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>
                    {categoryEmojis[cat] || cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className="skeleton" style={{ height: '50px' }} />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }} className="muted">
              Tidak ada aktivitas yang cocok.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border2, #262522)', textAlign: 'left' }} className="muted">
                    <th style={{ padding: '10px' }}>App / Display Name</th>
                    <th style={{ padding: '10px' }}>Window Title</th>
                    <th style={{ padding: '10px', width: '80px' }}>Start</th>
                    <th style={{ padding: '10px', width: '100px', textAlign: 'right' }}>Durasi</th>
                    <th style={{ padding: '10px', width: '160px', textAlign: 'right' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.slice(0, listLimit).map((item, idx) => {
                    const catColor = categoryColors[item.category] || '#64748b';
                    return (
                      <tr 
                        key={`${item.app}-${item.window}-${item.started}-${idx}`} 
                        className="feed-item-row"
                        style={{ borderBottom: '1px solid var(--border2, #262522)', cursor: 'pointer' }}
                        onClick={() => openQuickRule(item.app, item.display_name, item.category)}
                      >
                        <td style={{ padding: '12px 10px', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: catColor }} />
                            {item.display_name}
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '13px', maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} className="muted">
                          {item.window}
                        </td>
                        <td style={{ padding: '12px 10px', fontSize: '12px' }} className="muted">
                          {item.started}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 'bold', color: 'var(--green)' }}>
                          {formatMinutes(item.minutes, range)}
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <select
                            value={item.category || 'uncategorized'}
                            onChange={(e) => {
                              quickAssignCategory(item.app, e.target.value);
                            }}
                            className="category-select"
                          >
                            {categoryOptions.map((cat) => (
                              <option key={cat} value={cat}>
                                {categoryEmojis[cat] || cat}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredItems.length > listLimit && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    className="btn ghost" 
                    onClick={() => setListLimit(prev => prev + 15)}
                    style={{ padding: '8px 24px' }}
                  >
                    Tampilkan Lebih Banyak ({filteredItems.length - listLimit} tersisa)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}











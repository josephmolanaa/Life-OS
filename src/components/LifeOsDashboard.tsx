"use client";

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { CreditCard, Activity, Calendar, Trophy } from 'lucide-react';

type LifeOsDashboardProps = {
  financeSummary: {
    totalBalance: number;
    income: number;
    expense: number;
    savingRate: number;
  };
};

type TodoItem = {
  id: string;
  label: string;
  done: boolean;
  streak: number;
};

type ContribCell = {
  date: string;
  count: number;
};

type AwItem = {
  app: string;
  minutes: number;
};

export function LifeOsDashboard({ financeSummary }: LifeOsDashboardProps) {
  const [awStatus, setAwStatus] = useState('Checking...');
  const [awApps, setAwApps] = useState<AwItem[]>([
    { app: 'VS Code', minutes: 120 },
    { app: 'Google Chrome', minutes: 45 },
    { app: 'WhatsApp', minutes: 15 },
  ]);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [contribs, setContribs] = useState<ContribCell[]>([]);

  const pillars = [
    { name: 'Financial', val: financeSummary.totalBalance > 0 ? 'Active' : 'Empty', desc: `Rp ${financeSummary.totalBalance.toLocaleString('id-ID')}`, pct: 85 },
    { name: 'Career / AI', val: 'Builder', desc: 'Python, ML, Web3', pct: 78 },
    { name: 'Physique', val: 'Active', desc: 'Calisthenics, Strength', pct: 68 },
    { name: 'Social Skills', val: 'Precision', desc: 'Johan Liebert', pct: 61 },
  ];

  useEffect(() => {
    const fetchAw = async () => {
      try {
        const res = await fetch('http://localhost:5600/api/0/buckets');
        if (!res.ok) throw new Error();
        const buckets = await res.json();
        const winBucket = Object.keys(buckets).find(k => k.includes('aw-watcher-window'));
        if (!winBucket) throw new Error();

        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const evRes = await fetch(`http://localhost:5600/api/0/buckets/${winBucket}/events?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (!evRes.ok) throw new Error();
        const events = await evRes.json();

        const durations: Record<string, number> = {};
        events.forEach((e: any) => {
          const app = e.data.app || 'Unknown';
          const min = Math.max(1, Math.round((e.duration || 0) / 60));
          durations[app] = (durations[app] || 0) + min;
        });

        const sorted = Object.entries(durations)
          .map(([app, minutes]) => ({ app, minutes }))
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 3);

        if (sorted.length > 0) {
          setAwApps(sorted);
          setAwStatus('Live Connected');
        } else {
          setAwStatus('No activity in 24h');
        }
      } catch {
        setAwStatus('Offline (using fallback)');
      }
    };

    fetchAw();
    const interval = setInterval(fetchAw, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const defaultTodos = [
      { id: 'h1', label: 'Workout pagi (Physic)', done: false, streak: 0 },
      { id: 'h2', label: 'Baca buku 20 mnt (Social/Career)', done: false, streak: 0 },
      { id: 'h3', label: 'Journal / reflection (Discipline)', done: false, streak: 0 },
      { id: 'h4', label: 'Belajar AI 1 jam (Career)', done: false, streak: 0 },
      { id: 'h5', label: 'Push GitHub Streak (Career)', done: false, streak: 0 }
    ];

    const savedTodos = localStorage.getItem('lifeos_todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    } else {
      setTodos(defaultTodos);
    }

    const savedContribs = localStorage.getItem('lifeos_contribs');
    if (savedContribs) {
      setContribs(JSON.parse(savedContribs));
    } else {
      const initial = Array.from({ length: 35 }, (_, i) => ({
        date: new Date(Date.now() - (34 - i) * 24 * 60 * 60 * 1000).toDateString(),
        count: i % 7 === 0 ? 3 : i % 5 === 0 ? 1 : 0
      }));
      setContribs(initial);
    }
  }, []);

  const handleToggle = (id: string, checked: boolean) => {
    const updated = todos.map(t => {
      if (t.id === id) {
        return { ...t, done: checked, streak: checked ? t.streak + 1 : Math.max(0, t.streak - 1) };
      }
      return t;
    });
    setTodos(updated);
    localStorage.setItem('lifeos_todos', JSON.stringify(updated));

    const todayStr = new Date().toDateString();
    const doneCount = updated.filter(t => t.done).length;

    let contribUpdated = contribs.map(c => {
      if (c.date === todayStr) {
        return { ...c, count: doneCount };
      }
      return c;
    });

    if (!contribUpdated.some(c => c.date === todayStr)) {
      contribUpdated.shift();
      contribUpdated.push({ date: todayStr, count: doneCount });
    }

    setContribs(contribUpdated);
    localStorage.setItem('lifeos_contribs', JSON.stringify(contribUpdated));
  };

  return (
    <div style={{ display: 'grid', gap: '20px', width: '100%', maxWidth: '960px', margin: '0 auto' }}>
      {/* Title Hero */}
      <section className="card" style={{ padding: '24px' }}>
        <span className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Life OS Central</span>
        <h1 style={{ margin: '8px 0 6px', fontSize: '32px', fontWeight: 700, color: 'var(--text)', border: 'none', padding: 0 }}>Joseph Command Center</h1>
        <p className="muted" style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, maxWidth: '680px' }}>
          Satu pusat kendali kehidupan. Modul finance sync via Supabase. Habit harian di-track via Checklist & Consistency Graph. Aktivitas digital otomatis via ActivityWatch.
        </p>
      </section>

      {/* Pillars Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {pillars.map(p => (
          <article key={p.name} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>{p.name}</span>
                <span className="pill" style={{ margin: 0, padding: '3px 8px', fontSize: '11px', background: 'var(--surface2)', border: 'none', color: 'var(--text)' }}>{p.val}</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.3px' }}>{p.desc}</div>
            </div>
            <div style={{ background: 'var(--border2)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--green)', width: `${p.pct}%`, height: '100%' }} />
            </div>
          </article>
        ))}
      </div>

      {/* Daily Quest & Contribution Graph */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <section className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Daily Quest</h2>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>Real-life habit tracker</p>
            </div>
            <Trophy size={18} className="muted" />
          </div>
          <div className="list" style={{ display: 'grid', gap: '4px' }}>
            {todos.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => handleToggle(t.id, e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--green)', flexShrink: 0, marginTop: '2px' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--text3)' : 'var(--text)', fontSize: '14px', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.label}
                  </span>
                  <span className="muted" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>Streak {t.streak} hari</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Consistency Graph */}
        <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Consistency Graph</h2>
              <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>5-week habit intensity</p>
            </div>
            <Calendar size={18} className="muted" />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxWidth: '240px', width: '100%' }}>
              {contribs.map((c, i) => {
                const colors = [
                  'var(--surface2)', 
                  'rgba(76, 175, 80, 0.25)', 
                  'rgba(76, 175, 80, 0.45)', 
                  'rgba(76, 175, 80, 0.70)', 
                  'var(--green)', 
                ];
                const level = Math.min(4, c.count);
                return (
                  <div
                    key={i}
                    title={`${c.date}: ${c.count} tasks done`}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '4px',
                      background: colors[level],
                      border: level === 0 ? '1px solid var(--border)' : 'none'
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '11px', marginTop: '16px' }}>
            <span className="muted">Less</span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {['var(--surface2)', 'rgba(76, 175, 80, 0.25)', 'rgba(76, 175, 80, 0.45)', 'rgba(76, 175, 80, 0.70)', 'var(--green)'].map((color, i) => (
                <div key={i} style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, border: i === 0 ? '1px solid var(--border)' : 'none' }} />
              ))}
            </div>
            <span className="muted">More</span>
          </div>
        </section>
      </div>

      {/* Modules (Finance & ActivityWatch Live) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Finance Snapshot */}
        <article className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Finance Module</h2>
            <CreditCard size={18} className="muted" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '8px' }}>
              <div className="muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Income</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green)', marginTop: '4px' }}>
                Rp {financeSummary.income.toLocaleString('id-ID')}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '8px' }}>
              <div className="muted" style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 600 }}>Expense</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--red)', marginTop: '4px' }}>
                Rp {financeSummary.expense.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
          <NextLink href="/finance" className="btn" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Go to Finance App
          </NextLink>
        </article>

        {/* ActivityWatch Live Tracker */}
        <article className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>ActivityWatch</h2>
            <Activity size={18} className="muted" />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <p className="muted" style={{ fontSize: '12px', margin: '0 0 8px' }}>
              Status: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{awStatus}</span>
            </p>
            <div className="list" style={{ display: 'grid', gap: '2px' }}>
              {awApps.map(app => (
                <div key={app.app} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border2)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{app.app}</span>
                  <strong style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{app.minutes}m</strong>
                </div>
              ))}
            </div>
          </div>
          <NextLink href="/finance/activity" className="btn ghost" style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            View Full Activity Log
          </NextLink>
        </article>
      </div>
    </div>
  );
}

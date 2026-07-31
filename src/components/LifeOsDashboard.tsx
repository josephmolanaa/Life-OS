"use client";

import { useEffect, useState } from 'react';
import { DailyQuestCard } from './life-os-daily-quest';
import { ModuleCards } from './life-os-module-cards';
import { DashboardCard, type DashboardCardProps } from './DashboardCard';
import { Briefcase, HeartPulse, Users, Flame } from 'lucide-react';
import { PrivacyAmount } from './finance/privacy-amount';
import { PrivacyToggleButton } from './finance/privacy-toggle-button';

type LifeOsDashboardProps = {
  financeSummary: {
    totalBalance: number;
    income: number;
    expense: number;
    savingRate: number;
  };
};

type TodoRow = { id: string; label: string; done: boolean };
type TodoItem = { id: string; label: string; done: boolean; streak: number };
type ContribCell = { date: string; count: number };
type AwItem = { app: string; minutes: number };

const defaultTodos = [
  'Workout pagi (Physic)',
  'Baca buku 20 mnt (Social/Career)',
  'Journal / reflection (Discipline)',
  'Belajar AI 1 jam (Career)',
  'Push GitHub Streak (Career)',
];

function mapTodoRows(rows: TodoRow[]): TodoItem[] {
  return rows.map((row) => ({ ...row, streak: row.done ? 1 : 0 }));
}

async function ensureTodos(): Promise<TodoItem[]> {
  const response = await fetch('/api/todos', { cache: 'no-store' });
  if (!response.ok) throw new Error('Failed to load todos');
  const rows = (await response.json()) as TodoRow[];
  if (rows.length) return mapTodoRows(rows);

  await Promise.all(defaultTodos.map((label) => fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label }),
  })));

  const seeded = await fetch('/api/todos', { cache: 'no-store' });
  const seededRows = (await seeded.json()) as TodoRow[];
  return mapTodoRows(seededRows);
}

function getInitialContribs(): ContribCell[] {
  return Array.from({ length: 35 }, (_, index) => ({ date: new Date(Date.now() - (34 - index) * 24 * 60 * 60 * 1000).toDateString(), count: 0 }));
}

function ConsistencyGraph({ contribs }: { contribs: ContribCell[] }) {
  const colors = ['var(--surface2)', 'rgba(76, 175, 80, 0.25)', 'rgba(76, 175, 80, 0.45)', 'rgba(76, 175, 80, 0.70)', 'var(--green)'];
  return <section className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}><div style={{ marginBottom: '18px' }}><h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Consistency Graph</h2><p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>5-week habit intensity</p></div><div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxWidth: '240px', width: '100%' }}>{contribs.map((cell) => { const level = Math.min(4, cell.count); return <div key={cell.date} title={`${cell.date}: ${cell.count} tasks done`} style={{ aspectRatio: '1', borderRadius: '4px', background: colors[level], border: level === 0 ? '1px solid var(--border)' : 'none' }} />; })}</div></div></section>;
}

export function LifeOsDashboard({ financeSummary }: LifeOsDashboardProps) {
  const [awStatus, setAwStatus] = useState('Checking...');
  const [awApps, setAwApps] = useState<AwItem[]>([{ app: 'VS Code', minutes: 120 }, { app: 'Google Chrome', minutes: 45 }, { app: 'WhatsApp', minutes: 15 }]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [contribs, setContribs] = useState<ContribCell[]>(getInitialContribs());

  useEffect(() => {
    ensureTodos().then(setTodos).catch(() => setTodos(defaultTodos.map((label, index) => ({ id: `fallback-${index}`, label, done: false, streak: 0 }))));
  }, []);

  useEffect(() => {
    const fetchAw = async () => {
      try {
        const res = await fetch('http://localhost:5600/api/0/buckets');
        if (!res.ok) throw new Error();
        const buckets = await res.json();
        const winBucket = Object.keys(buckets).find((key) => key.includes('aw-watcher-window'));
        if (!winBucket) throw new Error();
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        const evRes = await fetch(`http://localhost:5600/api/0/buckets/${winBucket}/events?start=${start.toISOString()}&end=${end.toISOString()}`);
        if (!evRes.ok) throw new Error();
        const events = await evRes.json();
        const durations: Record<string, number> = {};
        events.forEach((event: { data?: { app?: string; window?: string }; duration?: number }) => {
          const app = event.data?.app || 'Unknown';
          const minutes = Math.max(1, Math.round((event.duration || 0) / 60));
          durations[app] = (durations[app] || 0) + minutes;
        });
        const sorted = Object.entries(durations).map(([app, minutes]) => ({ app, minutes })).sort((a, b) => b.minutes - a.minutes).slice(0, 3);
        if (sorted.length) {
          setAwApps(sorted);
          setAwStatus('Live Connected');
        } else {
          setAwStatus('No activity in 24h');
        }
      } catch {
        setAwStatus('Offline');
      }
    };

    fetchAw();
    const interval = setInterval(fetchAw, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (id: string, checked: boolean) => {
    const nextTodos = todos.map((todo) => todo.id === id ? { ...todo, done: checked, streak: checked ? Math.max(1, todo.streak) : 0 } : todo);
    setTodos(nextTodos);
    await fetch(`/api/todos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: checked }) });
    const today = new Date().toDateString();
    const doneCount = nextTodos.filter((todo) => todo.done).length;
    setContribs((current) => {
      const next = current.map((cell) => cell.date === today ? { ...cell, count: doneCount } : cell);
      if (!next.some((cell) => cell.date === today)) next.push({ date: today, count: doneCount });
      return next.slice(-35);
    });
  };
  
  const pillars: DashboardCardProps[] = [
    { title: 'Financial', value: <PrivacyAmount value={`Rp ${financeSummary.totalBalance.toLocaleString('id-ID')}`} />, icon: <Briefcase />, action: <PrivacyToggleButton />, link: '/finance' },
    { title: 'Career / AI', value: '75%', change: '+5% this week', changeType: 'positive', icon: <Briefcase />, link: '/pillars/career' },
    { title: 'Physique', value: 'Active', icon: <HeartPulse />, link: '/pillars/physique' },
    { title: 'Social', value: 'Good', icon: <Users />, link: '/pillars/social' },
    { title: 'Discipline', value: 'Strong', icon: <Flame />, link: '/pillars/discipline' },
  ];

  return (
    <div style={{ display: 'grid', gap: '24px', width: '100%' }}>
      <section>
        <span className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600 }}>Life OS Central</span>
        <h1 style={{ margin: '8px 0 6px', fontSize: '32px', fontWeight: 700, color: 'var(--text)', border: 'none', padding: 0 }}>Joseph Command Center</h1>
        <p className="muted" style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, maxWidth: '680px' }}>Your integrated life dashboard. Financials, habits, and productivity in one place.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {pillars.map(p => <DashboardCard key={p.title} {...p} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <DailyQuestCard todos={todos} onToggle={handleToggle} />
        <ConsistencyGraph contribs={contribs} />
      </div>
      
      <ModuleCards financeSummary={{ income: financeSummary.income, expense: financeSummary.expense }} awStatus={awStatus} awApps={awApps} />
    </div>
  );
}
